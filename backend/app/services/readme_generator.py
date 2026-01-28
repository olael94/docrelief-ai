from typing import Dict, Any, Optional # Added Optional for cache
import logging
from datetime import datetime
from uuid import UUID
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.generated_readme import GeneratedReadme, ReadmeStatus
from app.services.github_service import fetch_repository_content, detect_repo_changes
from app.services.zip_service import extract_zip_file, analyze_project_from_directory
from sqlalchemy import select
import tempfile
import shutil
import os

logger = logging.getLogger(__name__)


def create_readme_prompt(repo_data: Dict[str, Any], changes: Optional[Dict] = None) -> str:  # Added changes param for cache
    """
    Creates a structured prompt to generate README based on repository data.
    
    Args:
        repo_data: Dictionary with repository information
        
    Returns:
        str: Formatted prompt for the model
    """
    repo_name = repo_data.get("name", "the project")
    description = repo_data.get("description", "")
    language = repo_data.get("language", "Unknown")
    
    structure = "\n".join(repo_data.get("structure", [])[:20])  # Limit structure
    
    config_files_content = ""
    for file_path, content in list(repo_data.get("config_files", {}).items())[:5]:
        config_files_content += f"\n\n### {file_path}\n```\n{content[:1000]}\n```"
    
    main_files_summary = ""
    for file_path in list(repo_data.get("main_files", {}).keys())[:10]:
        main_files_summary += f"- {file_path}\n"
    
    # Note: We don't include existing README to avoid bias in generation
    
    prompt = f"""You are a software documentation expert. Your task is to generate a complete and professional README.md for a software project.

## Repository Information

**Name:** {repo_name}
**Description:** {description or "Not provided"}
**Main Language:** {language}

## Project Structure
{structure if structure else "Structure not available"}

## Configuration Files Found
{config_files_content if config_files_content else "No configuration files found"}

## Main Code Files
{main_files_summary if main_files_summary else "No code files analyzed"}

## README Instructions

Generate a complete README.md in English that includes:

1. **Title and Description**: A clear title and concise description of what the system/project does, based on code and configuration file analysis.

2. **Features**: List the main features of the system, inferred from the structure and analyzed files.

3. **Technologies Used**: List the technologies, frameworks and libraries used, based on the configuration files found.

4. **Prerequisites**: List the prerequisites needed to run the project (Python, Node.js, Docker, etc.).

5. **How to Run Locally**: 
   - Detailed step-by-step instructions to set up and run the project locally
   - How to install dependencies
   - How to configure environment variables (if necessary)
   - How to run the server/application
   - How to run tests (if applicable)

6. **Project Structure**: A brief explanation of the directory structure.

7. **Configuration**: Instructions about important configuration files (.env, config files, etc.).

Use appropriate Markdown formatting. Be specific and practical in execution instructions. If you cannot infer specific information from the code, use generic examples appropriate for the detected language/technology.

IMPORTANT: Focus especially on the "How to Run Locally" section - it must be clear, complete and follow best practices for the detected project type.
"""
    # This section is for cache, if a readme had been generated before and there are changes then regenerate README with context
    if changes:
        change_context = f"""

## Important Context: Recent Repository Changes

This repository has been updated since the last analysis:
- {changes['commits_count']} new commit(s) were added
- {changes['files_changed_count']} file(s) were modified

Recent commit messages:
"""
        for i, msg in enumerate(changes.get('commit_messages', []), 1):
            change_context += f"{i}. {msg}\n"

        change_context += f"\nFiles that changed:\n"
        for filename in changes.get('files_changed_names', [])[:10]:
            change_context += f"- {filename}\n"

        change_context += """

**Important:** Make sure the README accurately reflects these recent changes. For example:
- If new dependencies were added, ensure they appear in the installation/prerequisites section
- If new features were implemented, include them in the features section
- If configuration changed, update the configuration section accordingly
- If the project structure changed, reflect that in the structure explanation

Do NOT create a separate "Recent Updates" section. Instead, naturally incorporate these changes throughout the appropriate sections of the README.
"""

        prompt += change_context
    
    return prompt


async def generate_readme_with_langchain(repo_data: Dict[str, Any], changes: Optional[Dict] = None) -> str:  # Added changes param for cache
    """
    Generates a README using LangChain and OpenAI based on repository data.
    
    Args:
        repo_data: Dictionary with repository information
        
    Returns:
        str: Generated README content in Markdown
        
    Raises:
        Exception: If there's an error generating the README
    """
    try:
        # Create prompt
        logger.debug("[Prompt] Creating prompt for OpenAI...")
        prompt_text = create_readme_prompt(repo_data, changes)  # Pass changes
        prompt_tokens_estimate = len(prompt_text.split()) * 1.3  # Rough estimate
        logger.info(f"[Prompt] Prompt created - Estimated tokens: ~{int(prompt_tokens_estimate)}")
        logger.debug(f"   - Prompt length: {len(prompt_text)} characters")
        
        # Initialize LangChain ChatOpenAI
        model_name = "gpt-4o-mini"
        logger.info(f"[OpenAI] Initializing {model_name} model...")
        llm = ChatOpenAI(
            model=model_name,
            temperature=0.7,
            openai_api_key=settings.OPENAI_API_KEY,
        )
        
        # Create messages
        system_message = "You are a software documentation expert and professional README creator."
        messages = [
            SystemMessage(content=system_message),
            HumanMessage(content=prompt_text)
        ]
        
        # Log the full prompt being sent to OpenAI
        logger.info(f"[OpenAI] ===== Prompt being sent to OpenAI =====")
        logger.info(f"[OpenAI] Model: {model_name}")
        logger.info(f"[OpenAI] Temperature: 0.7")
        logger.info(f"[OpenAI] System message: {system_message}")
        logger.info(f"[OpenAI] System message length: {len(system_message)} chars")
        logger.info(f"[OpenAI] Prompt length: {len(prompt_text)} chars")
        logger.info(f"[OpenAI] Estimated tokens: ~{int(prompt_tokens_estimate)}")
        logger.info(f"[OpenAI] Full prompt content:")
        logger.info("=" * 80)
        logger.info(prompt_text)
        logger.info("=" * 80)
        logger.info(f"[OpenAI] Sending request to OpenAI API...")
        
        start_time = datetime.now()
        
        # Generate README
        response = await llm.ainvoke(messages)
        
        elapsed_time = (datetime.now() - start_time).total_seconds()
        
        # Extract content
        readme_content = response.content
        
        # Log response details
        logger.info(f"[OpenAI] Response received in {elapsed_time:.2f}s")
        logger.info(f"[OpenAI] README generated - {len(readme_content)} characters")
        
        # Try to extract token usage if available
        if hasattr(response, 'response_metadata'):
            usage = response.response_metadata.get('token_usage', {})
            if usage:
                logger.info(f"[OpenAI] Token usage - Input: {usage.get('prompt_tokens', 'N/A')}, Output: {usage.get('completion_tokens', 'N/A')}, Total: {usage.get('total_tokens', 'N/A')}")
        
        # Strip markdown code fences if present
        readme_content = readme_content.strip()
        if readme_content.startswith('```markdown'):
            readme_content = readme_content[len('```markdown'):].strip()
        if readme_content.startswith('```'):
            readme_content = readme_content[3:].strip()
        if readme_content.endswith('```'):
            readme_content = readme_content[:-3].strip()


        # Ensure it starts with a title if it doesn't
        if not readme_content.strip().startswith('#'):
            readme_content = f"# {repo_data.get('name', 'Project')}\n\n{readme_content}"
        
        return readme_content
        
    except Exception as e:
        raise Exception(f"Error generating README with OpenAI: {str(e)}")


async def process_readme_generation_async(readme_uuid: UUID, github_url: str):
    """
    Background task to process README generation asynchronously.
    
    This function:
    1. Updates status to PROCESSING
    2. Fetches repository content
    3. Generates README with OpenAI
    4. Updates database with COMPLETED status and content
    5. On error: updates with FAILED status
    
    Args:
        readme_uuid: UUID of the GeneratedReadme record
        github_url: GitHub repository URL to process
    """
    async with AsyncSessionLocal() as db:
        try:
            # Fetch the GeneratedReadme record
            result = await db.execute(
                select(GeneratedReadme).where(GeneratedReadme.id == readme_uuid)
            )
            readme_record = result.scalar_one_or_none()
            
            if not readme_record:
                logger.error(f"[Background Task] GeneratedReadme {readme_uuid} not found")
                return
            
            # Update status to PROCESSING
            readme_record.status = ReadmeStatus.PROCESSING.value
            await db.commit()
            logger.info(f"[Background Task] Started processing README {readme_uuid}")
            
            try:
                # [] STEP 1: Fetch repository content
                logger.info(f"[Background Task] Fetching repository content for {github_url}")
                repo_data = await fetch_repository_content(github_url)
                current_commit_sha = repo_data.get("latest_commit_sha")

                # [] STEP 2: Check for previous README generation
                prev_result = await db.execute(
                    select(GeneratedReadme)
                    .where(
                        GeneratedReadme.repo_url == github_url,
                        GeneratedReadme.status == ReadmeStatus.COMPLETED.value,
                        GeneratedReadme.commit_sha.isnot(None)
                    )
                    .order_by(GeneratedReadme.created_at.desc())
                    .limit(1)
                )
                previous_readme = prev_result.scalar_one_or_none()

                changes_detected = None

                # [] STEP 3: Detect changes if previous generation exists
                if previous_readme and current_commit_sha:
                    if previous_readme.commit_sha == current_commit_sha:
                        logger.info(f"[No Changes] Repo at same commit ({current_commit_sha[:7]}), generating fresh README")
                    else:
                        logger.info(f"[Changes Detected] Repo updated from {previous_readme.commit_sha[:7]} to {current_commit_sha[:7]}")
                        changes_detected = await detect_repo_changes(
                            github_url,
                            previous_readme.commit_sha,
                            current_commit_sha
                        )
                else:
                    logger.info(f"[First Time] No previous generation found for this repo")

                # [] STEP 4: Generate README (always fresh, include changes if detected)
                logger.info(f"[Background Task] Generating README with AI for {readme_record.repo_name}")
                readme_content = await generate_readme_with_langchain(repo_data, changes_detected)

                # [] STEP 5: Update record with COMPLETED status, content, and commit SHA
                readme_record.status = ReadmeStatus.COMPLETED.value
                readme_record.readme_content = readme_content
                readme_record.commit_sha = current_commit_sha
                await db.commit()

                logger.info(f"[Background Task] Successfully completed README generation {readme_uuid}")

            except Exception as e:
                # Update with FAILED status
                readme_record.status = ReadmeStatus.FAILED.value
                error_message = str(e)
                # Store error in readme_content for now (could add error_message field later)
                readme_record.readme_content = f"Error generating README: {error_message}"
                await db.commit()
                
                logger.error(f"[Background Task] Failed to generate README {readme_uuid}: {error_message}")
                
        except Exception as e:
            logger.error(f"[Background Task] Unexpected error processing README {readme_uuid}: {str(e)}")
            # Try to update status to FAILED if possible
            try:
                async with AsyncSessionLocal() as db2:
                    result = await db2.execute(
                        select(GeneratedReadme).where(GeneratedReadme.id == readme_uuid)
                    )
                    readme_record = result.scalar_one_or_none()
                    if readme_record:
                        readme_record.status = ReadmeStatus.FAILED.value
                        readme_record.readme_content = f"Unexpected error: {str(e)}"
                        await db2.commit()
            except:
                pass


async def process_zip_readme_generation_async(readme_uuid: UUID, zip_path: str):
    """
    Background task to process README generation from uploaded ZIP file.
    
    This function:
    1. Updates status to PROCESSING
    2. Extracts ZIP file
    3. Analyzes project directory
    4. Generates README with OpenAI
    5. Updates database with COMPLETED status and content
    6. Cleans up temporary files
    7. On error: updates with FAILED status and cleans up
    
    Args:
        readme_uuid: UUID of the GeneratedReadme record
        zip_path: Path to the uploaded ZIP file
    """
    extract_dir = None
    zip_dir = os.path.dirname(zip_path) if zip_path else None
    
    async with AsyncSessionLocal() as db:
        try:
            # Fetch the GeneratedReadme record
            result = await db.execute(
                select(GeneratedReadme).where(GeneratedReadme.id == readme_uuid)
            )
            readme_record = result.scalar_one_or_none()
            
            if not readme_record:
                logger.error(f"[ZIP Background Task] GeneratedReadme {readme_uuid} not found")
                # Clean up ZIP file if record not found
                if zip_path and os.path.exists(zip_path):
                    try:
                        os.remove(zip_path)
                        if zip_dir and os.path.exists(zip_dir):
                            try:
                                os.rmdir(zip_dir)
                            except:
                                pass
                    except:
                        pass
                return
            
            # Update status to PROCESSING
            readme_record.status = ReadmeStatus.PROCESSING.value
            await db.commit()
            logger.info(f"[ZIP Background Task] Started processing README {readme_uuid}")
            
            try:
                # STEP 1: Extract ZIP file
                logger.info(f"[ZIP Background Task] Extracting ZIP file: {zip_path}")
                extract_dir = tempfile.mkdtemp(prefix="readme_extract_")
                project_path = extract_zip_file(zip_path, extract_dir)
                logger.info(f"[ZIP Background Task] Extracted to: {project_path}")
                
                # STEP 2: Analyze project directory
                logger.info(f"[ZIP Background Task] Analyzing project structure")
                repo_data = analyze_project_from_directory(project_path, max_files=50)
                logger.info(f"[ZIP Background Task] Analysis complete - Language: {repo_data.get('language', 'Unknown')}")
                
                # STEP 3: Generate README (no changes detection for ZIP uploads)
                logger.info(f"[ZIP Background Task] Generating README with AI for {readme_record.repo_name}")
                readme_content = await generate_readme_with_langchain(repo_data, changes=None)
                
                # STEP 4: Update record with COMPLETED status and content
                readme_record.status = ReadmeStatus.COMPLETED.value
                readme_record.readme_content = readme_content
                await db.commit()
                
                logger.info(f"[ZIP Background Task] Successfully completed README generation {readme_uuid}")
                
            except Exception as e:
                # Update with FAILED status
                readme_record.status = ReadmeStatus.FAILED.value
                error_message = str(e)
                readme_record.readme_content = f"Error generating README: {error_message}"
                await db.commit()
                
                logger.error(f"[ZIP Background Task] Failed to generate README {readme_uuid}: {error_message}")
            
            finally:
                # STEP 5: Clean up temporary files
                try:
                    # Remove extracted directory
                    if extract_dir and os.path.exists(extract_dir):
                        logger.debug(f"[ZIP Background Task] Cleaning up extract directory: {extract_dir}")
                        shutil.rmtree(extract_dir, ignore_errors=True)
                    
                    # Remove ZIP file
                    if zip_path and os.path.exists(zip_path):
                        logger.debug(f"[ZIP Background Task] Cleaning up ZIP file: {zip_path}")
                        os.remove(zip_path)
                    
                    # Remove ZIP directory if empty
                    if zip_dir and os.path.exists(zip_dir):
                        try:
                            os.rmdir(zip_dir)
                        except:
                            pass  # Directory not empty or already removed
                    
                    logger.debug(f"[ZIP Background Task] Cleanup complete")
                except Exception as cleanup_error:
                    logger.warning(f"[ZIP Background Task] Error during cleanup: {str(cleanup_error)}")
                
        except Exception as e:
            logger.error(f"[ZIP Background Task] Unexpected error processing README {readme_uuid}: {str(e)}")
            
            # Try to update status to FAILED if possible
            try:
                async with AsyncSessionLocal() as db2:
                    result = await db2.execute(
                        select(GeneratedReadme).where(GeneratedReadme.id == readme_uuid)
                    )
                    readme_record = result.scalar_one_or_none()
                    if readme_record:
                        readme_record.status = ReadmeStatus.FAILED.value
                        readme_record.readme_content = f"Unexpected error: {str(e)}"
                        await db2.commit()
            except:
                pass
            
            # Clean up files even on unexpected error
            try:
                if extract_dir and os.path.exists(extract_dir):
                    shutil.rmtree(extract_dir, ignore_errors=True)
                if zip_path and os.path.exists(zip_path):
                    os.remove(zip_path)
                if zip_dir and os.path.exists(zip_dir):
                    try:
                        os.rmdir(zip_dir)
                    except:
                        pass
            except:
                pass
