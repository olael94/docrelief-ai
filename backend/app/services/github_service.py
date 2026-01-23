import re
import asyncio
import logging
from typing import Tuple, Dict, List, Optional
from github import Github
from github.GithubException import GithubException, UnknownObjectException
import httpx

logger = logging.getLogger(__name__)


def validate_github_url(github_url: str) -> Tuple[str, str]:
    """
    Validates and extracts owner and repository name from a GitHub URL.
    
    Args:
        github_url: GitHub repository URL
        
    Returns:
        Tuple[str, str]: (owner, repository_name)
        
    Raises:
        ValueError: If the URL is not valid
    """
    # Remove trailing slash and .git if present
    url = github_url.strip().rstrip('/').rstrip('.git')
    
    # Pattern to extract owner/repo
    pattern = r'github\.com[/:]([\w\.-]+)/([\w\.-]+)'
    match = re.search(pattern, url, re.IGNORECASE)
    
    if not match:
        raise ValueError(f"Invalid GitHub URL: {github_url}")
    
    owner = match.group(1)
    repo_name = match.group(2)
    
    return owner, repo_name


async def is_repository_public(github_url: str) -> Tuple[bool, Optional[Dict]]:
    """
    Checks if a GitHub repository is public and returns repository data.
    
    Args:
        github_url: GitHub repository URL
        
    Returns:
        Tuple[bool, Optional[Dict]]: (is_public, repo_data)
        - is_public: True if the repository is public, False otherwise
        - repo_data: Repository data from API if public, None otherwise
        
    Raises:
        ValueError: If the URL is not valid
        Exception: If there's an error accessing the GitHub API
    """
    owner, repo_name = validate_github_url(github_url)
    
    # Use httpx to make request without authentication
    # If returns 200, it's public. If 404/403, it's private or doesn't exist
    api_url = f"https://api.github.com/repos/{owner}/{repo_name}"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(api_url, timeout=10.0)
            
            if response.status_code == 200:
                repo_data = response.json()
                is_public = repo_data.get("private", True) == False
                return is_public, repo_data if is_public else None
            elif response.status_code == 404:
                # Repository not found (may be private or doesn't exist)
                raise ValueError(f"Repository not found: {owner}/{repo_name}")
            elif response.status_code == 403:
                # Rate limit or access denied
                raise Exception("Access denied to GitHub API. May be rate limit or private repository.")
            else:
                raise Exception(f"Error accessing repository: {response.status_code}")
                
        except httpx.HTTPError as e:
            raise Exception(f"Connection error with GitHub: {str(e)}")


def _fetch_repository_content_sync(github_url: str, repo_info: Optional[Dict] = None, max_files: int = 50) -> Dict[str, any]:
    """
    Synchronous helper function to fetch repository content using PyGithub.
    Will be executed in a separate thread.
    PyGithub provides a simpler API than making direct HTTP calls.
    
    Args:
        github_url: GitHub repository URL
        repo_info: Optional repository info from previous API call (to avoid duplicate request)
        max_files: Maximum number of files to read
    """
    owner, repo_name = validate_github_url(github_url)
    
    # Use PyGithub - simpler API, even though it uses urllib3 internally
    # Since it's public, no token needed
    g = Github()
    
    try:
        logger.debug(f"[GitHub] Accessing repository: {owner}/{repo_name}")
        repo = g.get_repo(f"{owner}/{repo_name}")
        
        # Use repo_info if provided (from is_repository_public), otherwise get from PyGithub
        if repo_info:
            result = {
                "name": repo_info.get("name", repo.name),
                "description": repo_info.get("description", "") or "",
                "language": repo_info.get("language", "Unknown"),
                "structure": [],
                "config_files": {},
                "main_files": {},
                "readme": None,
            }
            logger.debug(f"[GitHub] Using repository info from previous API call (avoiding duplicate request)")
        else:
            result = {
                "name": repo.name,
                "description": repo.description or "",
                "language": repo.language or "Unknown",
                "structure": [],
                "config_files": {},
                "main_files": {},
                "readme": None,
            }
        
        logger.info(f"[Repository Info] {result['name']} - Language: {result['language']}, Description: {result['description'][:50] if result['description'] else 'N/A'}...")
        
        # Important configuration files
        config_file_patterns = [
            "package.json", "requirements.txt", "Pipfile", "pyproject.toml",
            "Dockerfile", "docker-compose.yml", ".env.example", "Cargo.toml",
            "go.mod", "pom.xml", "build.gradle", "Makefile", "CMakeLists.txt",
            "setup.py", "setup.cfg", "composer.json", "Gemfile", "tsconfig.json",
            "package-lock.json", "yarn.lock", "Pipfile.lock"
        ]
        
        # Main code extensions
        code_extensions = [".py", ".js", ".ts", ".java", ".go", ".rs", ".cpp", ".c", ".cs", ".php", ".rb", ".swift", ".kt"]
        
        file_count = 0
        
        # Search for README
        try:
            logger.debug("[README Search] Looking for existing README files...")
            readme_files = ["README.md", "README.txt", "README", "readme.md"]
            for readme_name in readme_files:
                try:
                    readme_content = repo.get_contents(readme_name)
                    if readme_content:
                        result["readme"] = readme_content.decoded_content.decode('utf-8', errors='ignore')
                        logger.info(f"[README Search] Found existing README: {readme_name} ({len(result['readme'])} chars)")
                        break
                except:
                    continue
            if not result["readme"]:
                logger.debug("[README Search] No existing README found")
        except Exception as e:
            logger.warning(f"[README Search] Error searching for README: {str(e)}")
        
        # Search files in root and main directories
        def get_repo_structure(contents, path="", depth=0, max_depth=4):
            """Recursively searches repository structure"""
            nonlocal file_count
            
            if depth > max_depth or file_count >= max_files:
                return
            
            for content in contents:
                if file_count >= max_files:
                    break
                
                # Log every item returned from GitHub
                content_path = content.path if hasattr(content, 'path') else f"{path}{content.name}"
                content_name_lower = content.name.lower()
                content_path_lower = content_path.lower()
                
                logger.debug(f"[GitHub Item] path={content_path}, type={content.type}, name={content.name}")
                
                # Skip test directories and files
                test_dir_names = ["test", "tests", "spec", "specs", "__tests__", "__test__"]
                is_test_dir = (
                    content.type == "dir" and (
                        content_name_lower in test_dir_names or
                        "/test/" in content_path_lower or
                        "/tests/" in content_path_lower or
                        "/spec/" in content_path_lower or
                        content_path_lower.endswith("/test") or
                        content_path_lower.endswith("/tests")
                    )
                )
                
                # Check if file is a test file
                is_test_file = content.type == "file" and (
                    any(content_name_lower.startswith("test_") or content_name_lower.endswith("_test." + ext) 
                        for ext in code_extensions) or
                    any(content_name_lower.endswith(".test." + ext) for ext in code_extensions) or
                    content_name_lower.endswith("_test.py") or
                    content_name_lower.endswith(".spec.") or
                    content_name_lower.endswith(".test.") or
                    "/test/" in content_path_lower or
                    "/tests/" in content_path_lower
                )
                
                if is_test_dir or is_test_file:
                    logger.debug(f"[Skip] Ignoring test file/directory: {content_path_lower}")
                    continue
                    
                if content.type == "dir":
                    # Add directory to structure (up to depth 3 for display)
                    if depth <= 3:
                        result["structure"].append(f"{path}{content.name}/")
                    
                    # Important code directories that we should always explore deeply
                    # These are common across many languages and project structures
                    important_code_dirs = ["src", "app", "lib", "main", "server", "client", "backend", "frontend",
                                          "cmd", "pkg", "internal", "components", "pages", "services", "controllers",
                                          "models", "views", "routes", "handlers", "utils", "helpers"]
                    
                    # Check if we're inside a path that starts with important code directories
                    # Examples: src/, src/main/, src/main/java/, app/, lib/, cmd/, pkg/, etc.
                    # This works for Java (src/main/java/), Python (src/), Go (cmd/, pkg/), Node.js (src/), etc.
                    is_in_code_path = any(
                        content_path_lower.startswith(f"{dir_name}/") or 
                        content_path_lower == dir_name or
                        f"/{dir_name}/" in content_path_lower
                        for dir_name in important_code_dirs
                    )
                    
                    # Always enter directories if:
                    # 1. It's in the important code directories list, OR
                    # 2. We're at root (depth 0), OR
                    # 3. We're inside a code path (continue descending - no strict depth limit), OR
                    # 4. We're still within reasonable depth (for other paths)
                    should_enter = (
                        content.name.lower() in important_code_dirs or 
                        depth == 0 or 
                        is_in_code_path or  # Always continue in code paths (works for any language)
                        depth < 3  # Always enter up to depth 3 for other paths
                    )
                    
                    if should_enter:
                        try:
                            logger.debug(f"[Directory] Entering: {content_path} (depth={depth}, is_in_code_path={is_in_code_path})")
                            sub_contents = repo.get_contents(content.path)
                            get_repo_structure(sub_contents, f"{path}{content.name}/", depth + 1, max_depth)
                        except Exception as e:
                            logger.debug(f"[Structure] Error entering directory {content.path}: {str(e)}")
                            continue
                else:
                    # It's a file
                    file_count += 1
                    file_path = f"{path}{content.name}"
                    
                    # Check if it's a configuration file
                    if content.name in config_file_patterns or any(content.name.endswith(ext) for ext in [".toml", ".yaml", ".yml", ".json", ".lock"]):
                        logger.debug(f"[File Decision] {file_path} -> CONFIG FILE")
                        try:
                            file_content = content.decoded_content.decode('utf-8', errors='ignore')
                            result["config_files"][file_path] = file_content[:5000]  # Limit size
                            logger.debug(f"[Config File] Found: {file_path} ({len(file_content)} chars, limited to 5000)")
                        except Exception as e:
                            logger.warning(f"[Config File] Error reading {file_path}: {str(e)}")
                    
                    # Check if it's a main code file
                    elif any(content.name.endswith(ext) for ext in code_extensions):
                        logger.debug(f"[File Decision] {file_path} -> CODE FILE")
                        # Read only some main files (not all)
                        if file_count <= max_files // 2:  # Half of files can be code
                            try:
                                file_content = content.decoded_content.decode('utf-8', errors='ignore')
                                # Limit file size
                                result["main_files"][file_path] = file_content[:3000]
                                logger.debug(f"[Code File] Found: {file_path} ({len(file_content)} chars, limited to 3000)")
                            except Exception as e:
                                logger.warning(f"[Code File] Error reading {file_path}: {str(e)}")
                        else:
                            logger.debug(f"[File Decision] {file_path} -> CODE FILE (skipped, file_count={file_count} > {max_files // 2})")
                    else:
                        logger.debug(f"[File Decision] {file_path} -> IGNORED (not config or code)")
        
        # Start from root
        try:
            logger.debug("[Structure] Starting repository structure analysis...")
            root_contents = repo.get_contents("")
            get_repo_structure(root_contents)
            logger.info(f"[Structure] Analysis complete - {len(result['structure'])} directories, {len(result['config_files'])} config files, {len(result['main_files'])} code files")
            logger.debug(f"   - Directories: {', '.join(result['structure'][:15])}{'...' if len(result['structure']) > 15 else ''}")
            logger.debug(f"   - Config files: {', '.join(list(result['config_files'].keys())[:10])}{'...' if len(result['config_files']) > 10 else ''}")
            logger.debug(f"   - Code files: {', '.join(list(result['main_files'].keys())[:10])}{'...' if len(result['main_files']) > 10 else ''}")
            logger.debug(f"   - Total files processed: {file_count}/{max_files}")
        except Exception as e:
            logger.error(f"[Structure] Error analyzing structure: {str(e)}")
            # If fails, try to fetch only main files
            try:
                for file_name in config_file_patterns[:10]:  # First 10 config files
                    try:
                        content = repo.get_contents(file_name)
                        if content and content.type == "file":
                            file_content = content.decoded_content.decode('utf-8', errors='ignore')
                            result["config_files"][file_name] = file_content[:5000]
                    except:
                        continue
            except:
                pass
        
        return result
        
    except UnknownObjectException:
        raise ValueError(f"Repository not found: {owner}/{repo_name}")
    except GithubException as e:
        if e.status == 403:
            raise Exception("Access denied. Repository may be private or rate limit exceeded.")
        raise Exception(f"Error accessing repository: {str(e)}")
    except Exception as e:
        raise Exception(f"Unexpected error fetching repository content: {str(e)}")


async def fetch_repository_content(github_url: str, repo_info: Optional[Dict] = None, max_files: int = 50) -> Dict[str, any]:
    """
    Fetches GitHub repository content, including source code and configuration files.
    Uses PyGithub for simplicity (executed in thread pool since PyGithub is synchronous).
    
    Args:
        github_url: GitHub repository URL
        repo_info: Optional repository info from previous API call (to avoid duplicate request)
        max_files: Maximum number of files to read (to avoid exceeding tokens)
        
    Returns:
        Dict containing:
            - structure: directory structure
            - config_files: configuration files content
            - main_files: main code files content
            - readme: existing README content (if any)
            - language: main repository language
            
    Raises:
        ValueError: If URL is not valid or repository not found
        Exception: If there's an error accessing the repository
    """
    # Execute synchronous PyGithub function in separate thread
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _fetch_repository_content_sync, github_url, repo_info, max_files)
