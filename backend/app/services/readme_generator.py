from typing import Dict, Any
import logging
from datetime import datetime
from uuid import UUID
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.generated_readme import GeneratedReadme, ReadmeStatus
from app.services.github_service import fetch_repository_content
from sqlalchemy import select

logger = logging.getLogger(__name__)


def create_readme_prompt(repo_data: Dict[str, Any]) -> str:
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
    
    prompt = f"""You are a software documentation expert. Your task is to generate a complete and professional README.md for a GitHub repository.

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
    
    return prompt


async def generate_readme_with_langchain(repo_data: Dict[str, Any]) -> str:
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
        prompt_text = create_readme_prompt(repo_data)
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
        
        logger.debug(f"[OpenAI] Sending request to OpenAI API...")
        logger.debug(f"   - Model: {model_name}")
        logger.debug(f"   - Temperature: 0.7")
        logger.debug(f"   - System message length: {len(system_message)} chars")
        logger.debug(f"   - User message length: {len(prompt_text)} chars")
        
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
                # Fetch repository content
                logger.info(f"[Background Task] Fetching repository content for {github_url}")
                repo_data = await fetch_repository_content(github_url)
                
                # Generate README with OpenAI
                logger.info(f"[Background Task] Generating README with AI for {readme_record.repo_name}")
                readme_content = await generate_readme_with_langchain(repo_data)
                
                # Update record with COMPLETED status and content
                readme_record.status = ReadmeStatus.COMPLETED.value
                readme_record.readme_content = readme_content
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
