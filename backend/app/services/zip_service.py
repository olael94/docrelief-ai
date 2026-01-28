import os
import zipfile
import tempfile
import logging
from typing import Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_zip_file(zip_path: str, extract_to: str) -> str:
    """
    Extracts a ZIP file to a temporary directory.
    
    Args:
        zip_path: Path to the ZIP file
        extract_to: Directory to extract to
        
    Returns:
        str: Path to the extracted directory
        
    Raises:
        ValueError: If ZIP file is invalid or corrupted
        Exception: If extraction fails
    """
    try:
        logger.debug(f"[ZIP Extract] Extracting {zip_path} to {extract_to}")
        
        # Validate ZIP file
        if not zipfile.is_zipfile(zip_path):
            raise ValueError(f"File is not a valid ZIP archive: {zip_path}")
        
        # Create extract directory if it doesn't exist
        os.makedirs(extract_to, exist_ok=True)
        
        # Extract ZIP file
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Check for zip bomb - limit total size
            total_size = sum(info.file_size for info in zip_ref.infolist())
            max_extract_size = 100 * 1024 * 1024  # 100 MB limit
            if total_size > max_extract_size:
                raise ValueError(f"ZIP file too large to extract safely: {total_size} bytes")
            
            # Extract all files
            zip_ref.extractall(extract_to)
            
            # Find the root project directory
            # If ZIP contains a single directory, use that; otherwise use extract_to
            extracted_items = os.listdir(extract_to)
            if len(extracted_items) == 1:
                single_item = os.path.join(extract_to, extracted_items[0])
                if os.path.isdir(single_item):
                    logger.debug(f"[ZIP Extract] Found single root directory: {single_item}")
                    return single_item
            
            logger.info(f"[ZIP Extract] Extracted {len(extracted_items)} items to {extract_to}")
            return extract_to
            
    except zipfile.BadZipFile:
        raise ValueError(f"Invalid or corrupted ZIP file: {zip_path}")
    except Exception as e:
        raise Exception(f"Error extracting ZIP file: {str(e)}")


def detect_language_from_files(config_files: Dict[str, str], main_files: Dict[str, str]) -> str:
    """
    Detects the primary programming language from project files.
    
    Args:
        config_files: Dictionary of config file paths to content
        main_files: Dictionary of main code file paths to content
        
    Returns:
        str: Detected language name
    """
    language_indicators = {
        "Python": ["requirements.txt", "setup.py", "pyproject.toml", "Pipfile", ".py"],
        "JavaScript": ["package.json", "yarn.lock", "package-lock.json", ".js", ".ts"],
        "Java": ["pom.xml", "build.gradle", ".java"],
        "Go": ["go.mod", "go.sum", ".go"],
        "Rust": ["Cargo.toml", ".rs"],
        "C/C++": ["CMakeLists.txt", "Makefile", ".c", ".cpp", ".h"],
        "PHP": ["composer.json", ".php"],
        "Ruby": ["Gemfile", ".rb"],
        "C#": [".cs", ".csproj"],
    }
    
    # Check config files first
    for file_path in config_files.keys():
        file_name = os.path.basename(file_path).lower()
        for lang, indicators in language_indicators.items():
            if any(indicator.lower() in file_name for indicator in indicators):
                logger.debug(f"[Language Detection] Detected {lang} from config file: {file_path}")
                return lang
    
    # Check main files
    for file_path in main_files.keys():
        for lang, indicators in language_indicators.items():
            if any(file_path.endswith(ext) for ext in indicators if ext.startswith(".")):
                logger.debug(f"[Language Detection] Detected {lang} from code file: {file_path}")
                return lang
    
    return "Unknown"


def analyze_project_from_directory(project_path: str, max_files: int = 50) -> Dict[str, Any]:
    """
    Analyzes a project directory and extracts structure, config files, and main code files.
    Mirrors the logic from github_service.py but works with local filesystem.
    
    Args:
        project_path: Path to the project root directory
        max_files: Maximum number of files to read
        
    Returns:
        Dict containing:
            - name: Project name (from directory name)
            - description: Empty (not available from ZIP)
            - language: Detected language
            - structure: Directory structure list
            - config_files: Configuration files content
            - main_files: Main code files content
            - readme: Existing README content (if any)
            - latest_commit_sha: None (not applicable for ZIP)
    """
    project_path = Path(project_path)
    if not project_path.exists() or not project_path.is_dir():
        raise ValueError(f"Project path does not exist or is not a directory: {project_path}")
    
    project_name = project_path.name
    logger.info(f"[ZIP Analysis] Analyzing project: {project_name}")
    
    result = {
        "name": project_name,
        "description": "",  # Not available from ZIP
        "language": "Unknown",
        "latest_commit_sha": None,  # Not applicable for ZIP uploads
        "structure": [],
        "config_files": {},
        "main_files": {},
        "readme": None,
    }
    
    # Configuration file patterns (same as GitHub service)
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
        logger.debug("[ZIP Analysis] Looking for existing README files...")
        readme_files = ["README.md", "README.txt", "README", "readme.md"]
        for readme_name in readme_files:
            readme_path = project_path / readme_name
            if readme_path.exists() and readme_path.is_file():
                try:
                    with open(readme_path, 'r', encoding='utf-8', errors='ignore') as f:
                        result["readme"] = f.read()
                    logger.info(f"[ZIP Analysis] Found existing README: {readme_name} ({len(result['readme'])} chars)")
                    break
                except Exception as e:
                    logger.warning(f"[ZIP Analysis] Error reading README {readme_name}: {str(e)}")
                    continue
        if not result["readme"]:
            logger.debug("[ZIP Analysis] No existing README found")
    except Exception as e:
        logger.warning(f"[ZIP Analysis] Error searching for README: {str(e)}")
    
    # Recursively walk directory structure
    def analyze_directory(dir_path: Path, relative_path: str = "", depth: int = 0, max_depth: int = 4):
        """Recursively analyzes directory structure"""
        nonlocal file_count
        
        if depth > max_depth or file_count >= max_files:
            return
        
        try:
            items = list(dir_path.iterdir())
        except PermissionError:
            logger.warning(f"[ZIP Analysis] Permission denied: {dir_path}")
            return
        except Exception as e:
            logger.warning(f"[ZIP Analysis] Error reading directory {dir_path}: {str(e)}")
            return
        
        for item in items:
            if file_count >= max_files:
                break
            
            item_name = item.name
            item_name_lower = item_name.lower()
            item_path_str = str(item.relative_to(project_path))
            item_path_lower = item_path_str.lower()
            
            logger.debug(f"[ZIP Analysis] Processing: {item_path_str} (type={'dir' if item.is_dir() else 'file'})")
            
            # Skip hidden files and directories (except important ones like .env.example)
            if item_name.startswith('.') and item_name not in ['.env.example', '.gitignore', '.dockerignore']:
                if item.is_dir() and item_name not in ['.git', '.github']:
                    continue
            
            # Skip test directories and files (same logic as GitHub service)
            test_dir_names = ["test", "tests", "spec", "specs", "__tests__", "__test__"]
            is_test_dir = (
                item.is_dir() and (
                    item_name_lower in test_dir_names or
                    "/test/" in item_path_lower or
                    "/tests/" in item_path_lower or
                    "/spec/" in item_path_lower or
                    item_path_lower.endswith("/test") or
                    item_path_lower.endswith("/tests")
                )
            )
            
            is_test_file = item.is_file() and (
                any(item_name_lower.startswith("test_") or item_name_lower.endswith("_test." + ext.lstrip('.')) 
                    for ext in code_extensions) or
                any(item_name_lower.endswith(".test." + ext.lstrip('.')) for ext in code_extensions) or
                item_name_lower.endswith("_test.py") or
                item_name_lower.endswith(".spec.") or
                item_name_lower.endswith(".test.") or
                "/test/" in item_path_lower or
                "/tests/" in item_path_lower
            )
            
            if is_test_dir or is_test_file:
                logger.debug(f"[ZIP Analysis] Skipping test file/directory: {item_path_str}")
                continue
            
            if item.is_dir():
                # Add directory to structure (up to depth 3 for display)
                if depth <= 3:
                    result["structure"].append(f"{relative_path}{item_name}/")
                
                # Important code directories (same as GitHub service)
                important_code_dirs = ["src", "app", "lib", "main", "server", "client", "backend", "frontend",
                                      "cmd", "pkg", "internal", "components", "pages", "services", "controllers",
                                      "models", "views", "routes", "handlers", "utils", "helpers"]
                
                is_in_code_path = any(
                    item_path_lower.startswith(f"{dir_name}/") or 
                    item_path_lower == dir_name or
                    f"/{dir_name}/" in item_path_lower
                    for dir_name in important_code_dirs
                )
                
                should_enter = (
                    item_name_lower in important_code_dirs or 
                    depth == 0 or 
                    is_in_code_path or
                    depth < 3
                )
                
                if should_enter:
                    try:
                        logger.debug(f"[ZIP Analysis] Entering directory: {item_path_str} (depth={depth})")
                        analyze_directory(item, f"{relative_path}{item_name}/", depth + 1, max_depth)
                    except Exception as e:
                        logger.debug(f"[ZIP Analysis] Error entering directory {item_path_str}: {str(e)}")
                        continue
            else:
                # It's a file
                file_count += 1
                file_path = item_path_str
                
                try:
                    # Check if it's a configuration file
                    if item_name in config_file_patterns or any(item_name.endswith(ext) for ext in [".toml", ".yaml", ".yml", ".json", ".lock"]):
                        logger.debug(f"[ZIP Analysis] Config file: {file_path}")
                        try:
                            with open(item, 'r', encoding='utf-8', errors='ignore') as f:
                                file_content = f.read()
                            result["config_files"][file_path] = file_content[:5000]  # Limit size
                            logger.debug(f"[ZIP Analysis] Read config file: {file_path} ({len(file_content)} chars, limited to 5000)")
                        except Exception as e:
                            logger.warning(f"[ZIP Analysis] Error reading config file {file_path}: {str(e)}")
                    
                    # Check if it's a main code file
                    elif any(item_name.endswith(ext) for ext in code_extensions):
                        logger.debug(f"[ZIP Analysis] Code file: {file_path}")
                        if file_count <= max_files // 2:  # Half of files can be code
                            try:
                                with open(item, 'r', encoding='utf-8', errors='ignore') as f:
                                    file_content = f.read()
                                result["main_files"][file_path] = file_content[:3000]  # Limit size
                                logger.debug(f"[ZIP Analysis] Read code file: {file_path} ({len(file_content)} chars, limited to 3000)")
                            except Exception as e:
                                logger.warning(f"[ZIP Analysis] Error reading code file {file_path}: {str(e)}")
                        else:
                            logger.debug(f"[ZIP Analysis] Skipping code file (limit reached): {file_path}")
                except Exception as e:
                    logger.warning(f"[ZIP Analysis] Error processing file {file_path}: {str(e)}")
                    continue
    
    # Start analysis from project root
    try:
        logger.debug("[ZIP Analysis] Starting directory structure analysis...")
        analyze_directory(project_path)
        
        # Detect language
        result["language"] = detect_language_from_files(result["config_files"], result["main_files"])
        
        logger.info(f"[ZIP Analysis] Analysis complete - {len(result['structure'])} directories, {len(result['config_files'])} config files, {len(result['main_files'])} code files, language: {result['language']}")
        logger.debug(f"   - Directories: {', '.join(result['structure'][:15])}{'...' if len(result['structure']) > 15 else ''}")
        logger.debug(f"   - Config files: {', '.join(list(result['config_files'].keys())[:10])}{'...' if len(result['config_files']) > 10 else ''}")
        logger.debug(f"   - Code files: {', '.join(list(result['main_files'].keys())[:10])}{'...' if len(result['main_files']) > 10 else ''}")
        
    except Exception as e:
        logger.error(f"[ZIP Analysis] Error analyzing project structure: {str(e)}")
        # Still return what we have
        result["language"] = detect_language_from_files(result["config_files"], result["main_files"])
    
    return result
