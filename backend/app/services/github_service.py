import re
import asyncio
import logging
from typing import Tuple, Dict, List, Optional
from github import Github
from github.GithubException import GithubException, UnknownObjectException
import httpx
from app.config import settings

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
    logger.info(
        f"[URL Validation] Input URL: '{github_url}' (length: {len(github_url)})"
    )

    # Remove trailing slash and .git if present
    # IMPORTANT: Use endswith() and slicing, not rstrip() which removes individual characters!
    url = github_url.strip().rstrip("/")
    if url.endswith(".git"):
        url = url[:-4]  # Remove '.git' from the end
    logger.debug(f"[URL Validation] Cleaned URL: '{url}' (length: {len(url)})")

    # Use a more robust approach: split by 'github.com/' and then by '/'
    # This avoids regex issues with special characters
    if "github.com/" not in url.lower() and "github.com:" not in url.lower():
        logger.error(f"[URL Validation] Invalid GitHub URL format: {github_url}")
        raise ValueError(f"Invalid GitHub URL: {github_url}")

    # Extract the part after github.com/
    if "github.com/" in url.lower():
        parts_after_github = url.lower().split("github.com/")[1]
    else:
        parts_after_github = url.lower().split("github.com:")[1]

    # Split by '/' to get owner and repo
    path_parts = parts_after_github.split("/")

    if len(path_parts) < 2:
        logger.error(
            f"[URL Validation] Could not extract owner/repo from: {github_url}"
        )
        raise ValueError(f"Invalid GitHub URL: {github_url}")

    # Get owner and repo from the original URL (preserve case)
    if "github.com/" in url:
        original_parts = url.split("github.com/")[1].split("/")
    else:
        original_parts = url.split("github.com:")[1].split("/")

    owner = original_parts[0]
    repo_name = "/".join(
        original_parts[1:]
    )  # Join in case repo name has slashes (shouldn't, but safe)

    # Remove any trailing .git
    if repo_name.endswith(".git"):
        repo_name = repo_name[:-4]

    # Log extracted values for debugging with full details
    logger.info(
        f"[URL Validation] Extracted owner: '{owner}' (length: {len(owner)}), repo: '{repo_name}' (length: {len(repo_name)})"
    )
    logger.info(
        f"[URL Validation] Full extraction - owner='{owner}', repo='{repo_name}'"
    )

    # Validate that we got something
    if not owner or not repo_name:
        logger.error(
            f"[URL Validation] Empty extraction - owner: '{owner}', repo: '{repo_name}'"
        )
        raise ValueError(f"Could not extract owner/repo from URL: {github_url}")

    # Validate characters (GitHub allows alphanumeric, hyphens, underscores, dots)
    import string

    allowed_chars = string.ascii_letters + string.digits + "._-"
    if not all(c in allowed_chars for c in owner) or not all(
        c in allowed_chars for c in repo_name
    ):
        logger.warning(
            f"[URL Validation] Owner or repo contains invalid characters - owner: '{owner}', repo: '{repo_name}'"
        )
        # Still allow it, but log a warning

    return owner, repo_name


async def is_repository_accessible(
    github_url: str, github_api_key: Optional[str] = None
) -> Tuple[bool, Optional[Dict], bool]:
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
    logger.info(
        f"[GitHub Auth] Extracted - Owner: '{owner}' (length: {len(owner)}), Repo: '{repo_name}' (length: {len(repo_name)})"
    )

    # Use httpx to make request with optional authentication
    api_url = f"https://api.github.com/repos/{owner}/{repo_name}"

    # Log the full API URL to verify it's correct
    logger.info(f"[GitHub Auth] API URL: {api_url}")

    # Prepare headers
    headers = {}
    if github_api_key:
        headers["Authorization"] = f"token {github_api_key}"
        logger.info(
            f"[GitHub Auth] Using API key for authentication (key length: {len(github_api_key)})"
        )

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"[GitHub Auth] Making request to: {api_url}")
            logger.info(
                f"[GitHub Auth] Headers: {'With Authorization' if github_api_key else 'No Authorization'}"
            )
            response = await client.get(api_url, headers=headers, timeout=10.0)

            logger.debug(f"[GitHub Auth] Response status: {response.status_code}")

            if response.status_code == 200:
                repo_data = response.json()
                is_public = repo_data.get("private", True) == False
                logger.info(
                    f"[GitHub Auth] Repository {owner}/{repo_name} is {'PUBLIC' if is_public else 'PRIVATE'} and accessible"
                )
                return True, repo_data, is_public
            elif response.status_code == 404:
                # Repository not found or doesn't exist
                # Note: GitHub may return 404 for private repos even with invalid API key (security)
                logger.warning(f"[GitHub Auth] 404 response for {owner}/{repo_name}")
                logger.warning(
                    f"[GitHub Auth] Full owner: '{owner}', Full repo: '{repo_name}'"
                )
                error_msg = f"Repository not found: {owner}/{repo_name}"
                if github_api_key:
                    error_msg += ". The repository may not exist, or the API key may be invalid or lack access permissions."
                logger.warning(f"[GitHub Auth] Error message: {error_msg}")
                raise ValueError(error_msg)
            elif response.status_code == 403:
                # Rate limit or access denied
                error_body = (
                    response.text[:200] if response.text else "No error details"
                )
                logger.warning(f"[GitHub Auth] 403 response: {error_body}")
                if github_api_key:
                    raise Exception(
                        "Access denied. The provided GitHub API key may be invalid or lack permissions. Check if the token has 'repo' scope for private repositories."
                    )
                else:
                    raise Exception(
                        "Access denied to GitHub API. Repository may be private - provide a GitHub API key to access private repositories."
                    )
            elif response.status_code == 401:
                # Unauthorized - invalid token
                error_body = (
                    response.text[:200] if response.text else "No error details"
                )
                logger.warning(f"[GitHub Auth] 401 response: {error_body}")
                raise Exception(
                    "Invalid GitHub API key. Please check your token. Make sure it's a valid personal access token with 'repo' scope."
                )
            else:
                error_body = (
                    response.text[:200] if response.text else "No error details"
                )
                logger.error(
                    f"[GitHub Auth] Unexpected status {response.status_code}: {error_body}"
                )
                raise Exception(
                    f"Error accessing repository: {response.status_code} - {error_body}"
                )

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


def _fetch_repository_content_sync(
    github_url: str,
    repo_info: Optional[Dict] = None,
    max_files: int = 50,
    github_api_key: Optional[str] = None,
    branch: Optional[str] = None,
) -> Dict[str, any]:
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
                "latest_commit_sha": latest_commit_sha,  # Store latest commit SHA
                "structure": [],
                "config_files": {},
                "main_files": {},
                "readme": None,
            }
            logger.debug(
                f"[GitHub] Using repository info from previous API call (avoiding duplicate request)"
            )
        else:
            result = {
                "name": repo.name,
                "description": repo.description or "",
                "language": repo.language or "Unknown",
                "latest_commit_sha": latest_commit_sha,  # Store latest commit SHA
                "structure": [],
                "config_files": {},
                "main_files": {},
                "readme": None,
            }

        logger.info(
            f"[Repository Info] {result['name']} - Language: {result['language']}, Description: {result['description'][:50] if result['description'] else 'N/A'}..."
        )

        # Search for existing README
        try:
            readme_files = ["README.md", "README.txt", "README", "readme.md"]
            for readme_name in readme_files:
                try:
                    readme_content = repo.get_contents(readme_name)
                    if readme_content:
                        result["readme"] = readme_content.decoded_content.decode(
                            "utf-8", errors="ignore"
                        )
                        logger.info(f"[README Search] Found: {readme_name}")
                        break
                except:
                    continue
        except Exception as e:
            logger.warning(f"[README Search] Error: {str(e)}")

        # Noise directories to skip
        noise_dir_names = {
            "build", "dist", ".vscode", ".idea", "__pycache__",
            "node_modules", ".cache", "coverage", "htmlcov",
            ".pytest_cache", "venv", ".venv", "env", ".next",
            "target", "out", ".gradle", ".autograde", ".devcontainer",
            ".mvn", ".github", "test", "tests", "spec", "specs",
            "__tests__", "__test__",
        }

        # Config files to prioritize reading
        config_file_patterns = {
            "package.json", "requirements.txt", "Pipfile", "pyproject.toml",
            "Dockerfile", "docker-compose.yml", ".env.example", "Cargo.toml",
            "go.mod", "pom.xml", "build.gradle", "Makefile", "CMakeLists.txt",
            "setup.py", "setup.cfg", "composer.json", "Gemfile", "tsconfig.json",
        }

        # Code file extensions
        code_extensions = {
            ".py", ".js", ".ts", ".java", ".go", ".rs", ".cpp", ".c",
            ".cs", ".php", ".rb", ".swift", ".kt",
        }

        try:
            logger.info("[Tree API] Fetching full repository tree in one call...")
            # Get the default branch and its latest commit SHA
            default_branch = repo.default_branch
            branch_commit = repo.get_branch(default_branch).commit
            # One API call that returns every file and folder in the repo recursively
            git_tree = repo.get_git_tree(sha=branch_commit.sha, recursive=True)

            all_elements = git_tree.tree
            logger.info(f"[Tree API] Got {len(all_elements)} elements")

            # Lists to track what we find — filled as we loop through elements
            priority_config_files = []   # e.g. package.json, requirements.txt
            high_value_code_files = []   # entry points, controllers, routes, services
            medium_value_code_files = [] # other code files that aren't low value
            root_files = []              # files sitting at the root level

            # File name patterns to prioritize or skip
            high_value_patterns = [
                'application', 'main', 'app', 'controller', 'router', 'route',
                'config', 'security', 'index', 'server'
            ]
            low_value_patterns = [
                'dto', 'model', 'entity', 'util', 'helper', 'exception',
                'repository', 'mapper', 'constant', 'migration'
            ]

            for element in all_elements:
                path = element.path        # full path e.g. src/main/java/App.java
                parts = path.split("/")    # ['src', 'main', 'java', 'App.java']
                name = parts[-1]           # just the file/folder name
                name_lower = name.lower()
                depth = len(parts) - 1     # 0 = root level, 1 = one level deep, etc.

                # Skip this element if any of its parent folders is a noise dir
                if any(p.lower() in noise_dir_names for p in parts[:-1]):
                    continue
                # Skip if this directory itself is noise
                if element.type == "tree" and name_lower in noise_dir_names:
                    continue

                if element.type == "tree":
                    # It's a directory — add it to the structure list
                    result["structure"].append(path + "/")
                elif element.type == "blob":
                    # It's a file — if it's at root level, show it in structure too
                    if depth == 0:
                        # Only include root files that are meaningful for README generation
                        meaningful_root_files = {
                            'readme.md', 'license', 'license.md', 'license.txt',
                            'makefile', 'dockerfile', 'docker-compose.yml',
                            'docker-compose.yaml', '.env.example', 'package.json',
                            'requirements.txt', 'pom.xml', 'build.gradle',
                            'cargo.toml', 'go.mod', 'pyproject.toml', 'setup.py',
                            'gemfile', 'composer.json', 'tsconfig.json',
                        }
                        if name_lower in meaningful_root_files:
                            root_files.append(path)

                    # Check if it's a config file we want to read
                    if name in config_file_patterns or any(
                        name.endswith(ext) for ext in [".toml", ".yaml", ".yml", ".json", ".lock"]
                    ):
                        priority_config_files.append(path)
                    # Check if it's a code file we want to read
                    elif any(name.endswith(ext) for ext in code_extensions):
                        is_test = (
                            name_lower.startswith("test_")
                            or name_lower.endswith("_test.py")
                            or ".test." in name_lower
                            or ".spec." in name_lower
                            or any(p.lower() in {"test", "tests", "spec", "specs"} for p in parts)
                        )
                        if not is_test:
                            is_high_value = any(k in name_lower for k in high_value_patterns)
                            is_low_value = any(k in name_lower for k in low_value_patterns)
                            if is_high_value:
                                high_value_code_files.append(path)
                            elif not is_low_value:
                                medium_value_code_files.append(path)

            # Append root files at the end of the structure list
            result["structure"].extend(root_files)

            # Combine: high value first, then medium value
            priority_code_files = high_value_code_files + medium_value_code_files

            logger.info(
                f"[Tree API] Found {len(result['structure'])} dirs, "
                f"{len(priority_config_files)} config files, "
                f"{len(priority_code_files)} code files "
                f"({len(high_value_code_files)} high-value, {len(medium_value_code_files)} medium)"
            )

            # Read config files (up to 10) — these inform tech stack, env vars, run commands
            for file_path in priority_config_files[:10]:
                try:
                    file_content = repo.get_contents(file_path).decoded_content.decode("utf-8", errors="ignore")
                    result["config_files"][file_path] = file_content[:5000]
                    logger.debug(f"[Config File] Read: {file_path}")
                except Exception as e:
                    logger.warning(f"[Config File] Error reading {file_path}: {str(e)}")

            # Read only top 5 code files (high-value first) with tight content limit
            for file_path in priority_code_files[:5]:
                try:
                    file_content = repo.get_contents(file_path).decoded_content.decode("utf-8", errors="ignore")
                    result["main_files"][file_path] = file_content[:500]
                    logger.debug(f"[Code File] Read: {file_path}")
                except Exception as e:
                    logger.warning(f"[Code File] Error reading {file_path}: {str(e)}")

            logger.info(
                f"[Tree API] Complete - {len(result['config_files'])} config, "
                f"{len(result['main_files'])} code files read"
            )

        except Exception as e:
            logger.error(f"[Tree API] Failed: {str(e)}, falling back to direct fetch")
            # Fallback: try to read key config files directly without tree traversal
            for file_name in list(config_file_patterns)[:10]:
                try:
                    content = repo.get_contents(file_name)
                    if content and content.type == "file":
                        file_content = content.decoded_content.decode("utf-8", errors="ignore")
                        result["config_files"][file_name] = file_content[:5000]
                except:
                    continue

        return result

    except UnknownObjectException:
        raise ValueError(f"Repository not found: {owner}/{repo_name}")
    except GithubException as e:
        if e.status == 403:
            raise Exception(
                "Access denied. Repository may be private or rate limit exceeded."
            )
        raise Exception(f"Error accessing repository: {str(e)}")
    except Exception as e:
        raise Exception(f"Unexpected error fetching repository content: {str(e)}")


async def fetch_repository_content(
    github_url: str,
    repo_info: Optional[Dict] = None,
    max_files: int = 50,
    github_api_key: Optional[str] = None,
    branch: Optional[str] = None,
) -> Dict[str, any]:
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
    return await loop.run_in_executor(
        None,
        _fetch_repository_content_sync,
        github_url,
        repo_info,
        max_files,
        github_api_key,
    )


async def detect_repo_changes(
    github_url: str,
    old_commit: str,
    new_commit: str,
    github_api_key: Optional[str] = None,
) -> Dict:
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
                    "files_changed_names": [
                        f["filename"] for f in files_changed[:10]
                    ],  # First 10 files
                    "commits_count": len(commits),
                    "additions": data.get("total_commits", 0),
                    "deletions": data.get("deletions", 0),
                    "commit_messages": [
                        c.get("commit", {}).get("message", "").split("\n")[0]
                        for c in commits[:5]
                    ],  # First 5 commit messages
                }

                logger.info(
                    f"[Changes] Detected {changes['commits_count']} commits, {changes['files_changed_count']} files changed"
                )
                return changes
            else:
                logger.warning(
                    f"[Changes] Could not compare commits: {response.status_code}"
                )
                return None

    except Exception as e:
        logger.error(f"[Changes] Error detecting changes: {str(e)}")
        return None


async def get_file_sha(
    owner: str, repo: str, path: str, branch: str, token: str
) -> Optional[str]:
    """Check if file exists and return its SHA, or None if not exists"""
    import httpx

    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}"
    headers = {"Authorization": f"token {token}"}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            return response.json().get("sha")
        elif response.status_code == 404:
            return None
        else:
            response.raise_for_status()


async def create_file_in_repo(
    owner: str,
    repo: str,
    path: str,
    content: str,
    branch: str,
    message: str,
    token: str,
) -> dict:
    """Create a new file in the repository"""
    import httpx
    import base64

    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    headers = {"Authorization": f"token {token}", "Content-Type": "application/json"}
    data = {
        "message": message,
        "content": base64.b64encode(content.encode()).decode(),
        "branch": branch,
    }

    async with httpx.AsyncClient() as client:
        response = await client.put(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()


async def update_file_in_repo(
    owner: str,
    repo: str,
    path: str,
    content: str,
    branch: str,
    message: str,
    sha: str,
    token: str,
) -> dict:
    """Update an existing file in the repository"""
    import httpx
    import base64

    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    headers = {"Authorization": f"token {token}", "Content-Type": "application/json"}
    data = {
        "message": message,
        "content": base64.b64encode(content.encode()).decode(),
        "sha": sha,
        "branch": branch,
    }

    async with httpx.AsyncClient() as client:
        response = await client.put(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()
