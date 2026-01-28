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
    # Log input URL
    logger.info(f"[URL Validation] Input URL: '{github_url}' (length: {len(github_url)})")
    
    # Remove trailing slash and .git if present
    # IMPORTANT: Use endswith() and slicing, not rstrip() which removes individual characters!
    url = github_url.strip().rstrip('/')
    if url.endswith('.git'):
        url = url[:-4]  # Remove '.git' from the end
    logger.debug(f"[URL Validation] Cleaned URL: '{url}' (length: {len(url)})")
    
    # Use a more robust approach: split by 'github.com/' and then by '/'
    # This avoids regex issues with special characters
    if 'github.com/' not in url.lower() and 'github.com:' not in url.lower():
        logger.error(f"[URL Validation] Invalid GitHub URL format: {github_url}")
        raise ValueError(f"Invalid GitHub URL: {github_url}")
    
    # Extract the part after github.com/
    if 'github.com/' in url.lower():
        parts_after_github = url.lower().split('github.com/')[1]
    else:
        parts_after_github = url.lower().split('github.com:')[1]
    
    # Split by '/' to get owner and repo
    path_parts = parts_after_github.split('/')
    
    if len(path_parts) < 2:
        logger.error(f"[URL Validation] Could not extract owner/repo from: {github_url}")
        raise ValueError(f"Invalid GitHub URL: {github_url}")
    
    # Get owner and repo from the original URL (preserve case)
    if 'github.com/' in url:
        original_parts = url.split('github.com/')[1].split('/')
    else:
        original_parts = url.split('github.com:')[1].split('/')
    
    owner = original_parts[0]
    repo_name = '/'.join(original_parts[1:])  # Join in case repo name has slashes (shouldn't, but safe)
    
    # Remove any trailing .git
    if repo_name.endswith('.git'):
        repo_name = repo_name[:-4]
    
    # Log extracted values for debugging with full details
    logger.info(f"[URL Validation] Extracted owner: '{owner}' (length: {len(owner)}), repo: '{repo_name}' (length: {len(repo_name)})")
    logger.info(f"[URL Validation] Full extraction - owner='{owner}', repo='{repo_name}'")
    
    # Validate that we got something
    if not owner or not repo_name:
        logger.error(f"[URL Validation] Empty extraction - owner: '{owner}', repo: '{repo_name}'")
        raise ValueError(f"Could not extract owner/repo from URL: {github_url}")
    
    # Validate characters (GitHub allows alphanumeric, hyphens, underscores, dots)
    import string
    allowed_chars = string.ascii_letters + string.digits + '._-'
    if not all(c in allowed_chars for c in owner) or not all(c in allowed_chars for c in repo_name):
        logger.warning(f"[URL Validation] Owner or repo contains invalid characters - owner: '{owner}', repo: '{repo_name}'")
        # Still allow it, but log a warning
    
    return owner, repo_name


async def is_repository_accessible(github_url: str, github_api_key: Optional[str] = None) -> Tuple[bool, Optional[Dict], bool]:
    """
    Checks if a GitHub repository is accessible (public or private with auth) and returns repository data.
    
    Args:
        github_url: GitHub repository URL
        github_api_key: Optional GitHub API token for accessing private repositories
        
    Returns:
        Tuple[bool, Optional[Dict], bool]: (is_accessible, repo_data, is_public)
        - is_accessible: True if the repository is accessible (public or private with valid auth)
        - repo_data: Repository data from API if accessible, None otherwise
        - is_public: True if the repository is public, False if private
        
    Raises:
        ValueError: If the URL is not valid
        Exception: If there's an error accessing the GitHub API
    """
    owner, repo_name = validate_github_url(github_url)
    
    # Log extracted values to verify they're correct
    logger.info(f"[GitHub Auth] Extracted - Owner: '{owner}' (length: {len(owner)}), Repo: '{repo_name}' (length: {len(repo_name)})")
    
    # Use httpx to make request with optional authentication
    api_url = f"https://api.github.com/repos/{owner}/{repo_name}"
    
    # Log the full API URL to verify it's correct
    logger.info(f"[GitHub Auth] API URL: {api_url}")
    
    # Prepare headers
    headers = {}
    if github_api_key:
        headers["Authorization"] = f"token {github_api_key}"
        logger.info(f"[GitHub Auth] Using API key for authentication (key length: {len(github_api_key)})")
    
    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"[GitHub Auth] Making request to: {api_url}")
            logger.info(f"[GitHub Auth] Headers: {'With Authorization' if github_api_key else 'No Authorization'}")
            response = await client.get(api_url, headers=headers, timeout=10.0)
            
            logger.debug(f"[GitHub Auth] Response status: {response.status_code}")
            
            if response.status_code == 200:
                repo_data = response.json()
                is_public = repo_data.get("private", True) == False
                logger.info(f"[GitHub Auth] Repository {owner}/{repo_name} is {'PUBLIC' if is_public else 'PRIVATE'} and accessible")
                return True, repo_data, is_public
            elif response.status_code == 404:
                # Repository not found or doesn't exist
                # Note: GitHub may return 404 for private repos even with invalid API key (security)
                logger.warning(f"[GitHub Auth] 404 response for {owner}/{repo_name}")
                logger.warning(f"[GitHub Auth] Full owner: '{owner}', Full repo: '{repo_name}'")
                error_msg = f"Repository not found: {owner}/{repo_name}"
                if github_api_key:
                    error_msg += ". The repository may not exist, or the API key may be invalid or lack access permissions."
                logger.warning(f"[GitHub Auth] Error message: {error_msg}")
                raise ValueError(error_msg)
            elif response.status_code == 403:
                # Rate limit or access denied
                error_body = response.text[:200] if response.text else "No error details"
                logger.warning(f"[GitHub Auth] 403 response: {error_body}")
                if github_api_key:
                    raise Exception("Access denied. The provided GitHub API key may be invalid or lack permissions. Check if the token has 'repo' scope for private repositories.")
                else:
                    raise Exception("Access denied to GitHub API. Repository may be private - provide a GitHub API key to access private repositories.")
            elif response.status_code == 401:
                # Unauthorized - invalid token
                error_body = response.text[:200] if response.text else "No error details"
                logger.warning(f"[GitHub Auth] 401 response: {error_body}")
                raise Exception("Invalid GitHub API key. Please check your token. Make sure it's a valid personal access token with 'repo' scope.")
            else:
                error_body = response.text[:200] if response.text else "No error details"
                logger.error(f"[GitHub Auth] Unexpected status {response.status_code}: {error_body}")
                raise Exception(f"Error accessing repository: {response.status_code} - {error_body}")
                
        except httpx.HTTPError as e:
            logger.error(f"[GitHub Auth] HTTP error: {str(e)}")
            raise Exception(f"Connection error with GitHub: {str(e)}")
        except ValueError:
            # Re-raise ValueError as-is
            raise
        except Exception as e:
            logger.error(f"[GitHub Auth] Unexpected error: {str(e)}")
            raise


async def is_repository_public(github_url: str) -> Tuple[bool, Optional[Dict]]:
    """
    Checks if a GitHub repository is public and returns repository data.
    Maintains backward compatibility.
    
    Args:
        github_url: GitHub repository URL
        
    Returns:
        Tuple[bool, Optional[Dict]]: (is_public, repo_data)
    """
    is_accessible, repo_data, is_public = await is_repository_accessible(github_url)
    return is_public, repo_data if is_public else None


def _fetch_repository_content_sync(github_url: str, repo_info: Optional[Dict] = None, max_files: int = 50, github_api_key: Optional[str] = None) -> Dict[str, any]:
    """
    Synchronous helper function to fetch repository content using PyGithub.
    Will be executed in a separate thread.
    PyGithub provides a simpler API than making direct HTTP calls.
    
    Args:
        github_url: GitHub repository URL
        repo_info: Optional repository info from previous API call (to avoid duplicate request)
        max_files: Maximum number of files to read
        github_api_key: Optional GitHub API token for accessing private repositories
    """
    owner, repo_name = validate_github_url(github_url)
    
    # Use PyGithub - simpler API, even though it uses urllib3 internally
    # Use API key if provided for private repos
    if github_api_key:
        logger.debug(f"[GitHub] Using API key for authentication")
        g = Github(github_api_key)
    else:
        g = Github()
    
    try:
        logger.debug(f"[GitHub] Accessing repository: {owner}/{repo_name}")
        repo = g.get_repo(f"{owner}/{repo_name}")

        # Fetch latest commit SHA
        latest_commit_sha = None
        try:
            default_branch = repo.default_branch
            logger.debug(f"[Commit] Default branch: {default_branch}")
            latest_commit = repo.get_branch(default_branch).commit
            latest_commit_sha = latest_commit.sha
            logger.info(f"[Commit] Latest commit SHA: {latest_commit_sha[:7]}")
        except Exception as e:
            logger.warning(f"[Commit] Could not fetch commit SHA: {str(e)}")
            latest_commit_sha = None

        # Use repo_info if provided (from is_repository_public), otherwise get from PyGithub
        if repo_info:
            result = {
                "name": repo_info.get("name", repo.name),
                "description": repo_info.get("description", "") or "",
                "language": repo_info.get("language", "Unknown"),
                "latest_commit_sha": latest_commit_sha, # Store latest commit SHA
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
                "latest_commit_sha": latest_commit_sha, # Store latest commit SHA
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


async def fetch_repository_content(github_url: str, repo_info: Optional[Dict] = None, max_files: int = 50, github_api_key: Optional[str] = None) -> Dict[str, any]:
    """
    Fetches GitHub repository content, including source code and configuration files.
    Uses PyGithub for simplicity (executed in thread pool since PyGithub is synchronous).
    
    Args:
        github_url: GitHub repository URL
        repo_info: Optional repository info from previous API call (to avoid duplicate request)
        max_files: Maximum number of files to read (to avoid exceeding tokens)
        github_api_key: Optional GitHub API token for accessing private repositories
        
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
    return await loop.run_in_executor(None, _fetch_repository_content_sync, github_url, repo_info, max_files, github_api_key)

async def detect_repo_changes(github_url: str, old_commit: str, new_commit: str, github_api_key: Optional[str] = None) -> Dict:
    """
    Detects what changed between two commits using GitHub API.

    Args:
        github_url: GitHub repository URL
        old_commit: Previous commit SHA
        new_commit: New commit SHA
        github_api_key: Optional GitHub API token for accessing private repositories

    Returns:
        Dict with changes information or None if comparison failed
    """
    try:
        owner, repo_name = validate_github_url(github_url)

        # Use GitHub API to compare commits
        compare_url = f"https://api.github.com/repos/{owner}/{repo_name}/compare/{old_commit[:7]}...{new_commit[:7]}"

        # Prepare headers
        headers = {}
        if github_api_key:
            headers["Authorization"] = f"token {github_api_key}"

        async with httpx.AsyncClient() as client:
            response = await client.get(compare_url, headers=headers, timeout=10.0)

            if response.status_code == 200:
                data = response.json()

                files_changed = data.get("files", [])
                commits = data.get("commits", [])

                # Extract meaningful change info
                changes = {
                    "files_changed_count": len(files_changed),
                    "files_changed_names": [f["filename"] for f in files_changed[:10]],  # First 10 files
                    "commits_count": len(commits),
                    "additions": data.get("total_commits", 0),
                    "deletions": data.get("deletions", 0),
                    "commit_messages": [c.get("commit", {}).get("message", "").split("\n")[0] for c in commits[:5]]  # First 5 commit messages
                }

                logger.info(f"[Changes] Detected {changes['commits_count']} commits, {changes['files_changed_count']} files changed")
                return changes
            else:
                logger.warning(f"[Changes] Could not compare commits: {response.status_code}")
                return None

    except Exception as e:
        logger.error(f"[Changes] Error detecting changes: {str(e)}")
        return None
