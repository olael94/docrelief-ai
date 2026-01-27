export const sampleReadmeContent = `# Awesome Project

A comprehensive README demonstrating all the features of our split-screen editor.

## 🚀 Features

### Core Functionality
- [x] Split-screen editing with live preview
- [x] GitHub-flavored markdown support
- [x] Syntax highlighting for code blocks
- [ ] Real-time collaboration (coming soon)
- [ ] Export to multiple formats (planned)

### Supported Elements
- Headers and sections
- Emphasis and **bold text**
- Italic and *italic text*
- ~~Strikethrough~~ text
- \`Inline code\` snippets

## 📋 Task List Examples

### Completed Features
- [x] Monaco editor integration
- [x] React-markdown with GFM
- [x] Responsive layout design
- [x] Real-time synchronization

### In Progress
- [ ] API integration testing
- [ ] Error handling polish
- [ ] Performance optimization

### TODO
- [ ] GitHub integration
- [ ] Auto-save functionality
- [ ] Theme customization

## 💻 Code Examples

### JavaScript Example
\`\`\`javascript
// Example of a function to generate README content
function generateReadme(projectName, features) {
  return \`
# \${projectName}

## Features
\${features.map(feature => \`- \${feature}\`).join('\\n')}
  \`;
}

// Usage
const readme = generateReadme('MyProject', [
  'TypeScript support',
  'Unit tests',
  'CI/CD pipeline'
]);
\`\`\`

### Python Example
\`\`\`python
import os
import json

def load_config(config_path):
    """Load configuration from JSON file."""
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"error": "Config file not found"}

# Example usage
config = load_config('./config.json')
print(f"Config loaded: {config}")
\`\`\`

### CSS Example
\`\`\`css
/* Responsive grid layout for split-screen */
.editor-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  height: 100vh;
}

@media (max-width: 768px) {
  .editor-container {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
}
\`\`\`

## 📊 Feature Comparison Table

| Feature | Status | Priority | Release |
|---------|--------|----------|---------|
| Split-screen | ✅ Complete | High | v1.0 |
| Monaco Editor | ✅ Complete | High | v1.0 |
| Live Preview | ✅ Complete | High | v1.0 |
| GitHub Sync | 🚧 In Progress | Medium | v1.1 |
| Dark Mode | 📋 Planned | Low | v1.2 |
| Mobile App | ❌ Not Started | Low | v2.0 |

## 🔗 Links and References

### Documentation
- [Getting Started Guide](./docs/getting-started.md)
- [API Reference](./docs/api.md)
- [Examples](./examples/)

### External Resources
- [React Documentation](https://react.dev)
- [Monaco Editor Documentation](https://microsoft.github.io/monaco-editor/)
- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)

### Contact and Support
- Email: support@awesome-project.com
- Discord: [Join our community](https://discord.gg/awesome-project)
- GitHub Issues: [Report bugs](https://github.com/awesome-project/issues)

---

## 📝 Notes

This README serves as a comprehensive example of:
- GitHub-flavored markdown syntax
- Task lists and checkboxes
- Code blocks with syntax highlighting
- Tables with alignment
- Links and references
- Responsive design considerations

Last updated: January 25, 2026
`;

export const mockApiData = {
  id: 'demo-123',
  title: 'Awesome Project',
  content: sampleReadmeContent,
  repoUrl: 'https://github.com/example/awesome-project',
  createdAt: '2026-01-25T00:00:00Z',
  updatedAt: '2026-01-25T00:00:00Z'
};
