# mcp-strings-admin

MCP server for Duda strings admin service. Provides AI tools to manage translation strings.

## Installation

### From Private Registry (Duda Team)

1. Create GitHub Personal Access Token with `read:packages` permission: https://github.com/settings/tokens
2. Configure npm:
```bash
export GITHUB_TOKEN="your_token_here"
echo "registry=https://registry.npmjs.org/" > ~/.npmrc
echo "@duda-co:registry=https://npm-github-packs.dud4.co/" >> ~/.npmrc
echo "//npm-github-packs.dud4.co/:_authToken=\${GITHUB_TOKEN}" >> ~/.npmrc
```
3. Install:
```bash
npm install -g @duda-co/mcp-strings-admin
```

### From Source

```bash
git clone <repo>
cd mcp-strings-admin
npm install
npm run build
```

## Configuration

Set environment variables:
```bash
export STRINGS_ADMIN_HOST="http://prd-ms-strings-admin-1.dudamobile.com"  # Default
export LOG_LEVEL="info"  # Optional
```

## Setup Instructions

### Claude Desktop Setup

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `~/.config/Claude/claude_desktop_config.json` (Linux):

```json
{
  "mcpServers": {
    "strings-admin": {
      "command": "npx",
      "args": ["@duda-co/mcp-strings-admin"]
    }
  }
}
```

For global install: `"args": ["@duda-co/mcp-strings-admin"]`

Restart Claude Desktop.

### Cursor Setup

Create or edit `~/.cursor/mcp.json` (macOS/Linux) or `%USERPROFILE%\.cursor\mcp.json` (Windows):

```json
{
  "mcpServers": {
    "strings-admin": {
      "command": "npx",
      "args": ["@duda-co/mcp-strings-admin"]
    }
  }
}
```

### GitHub Copilot Setup

GitHub Copilot supports MCP servers through its **Agent Mode** in compatible IDEs. The setup process varies by IDE and requires configuring MCP servers in the Copilot extension settings.

#### VS Code with GitHub Copilot Extension

1. Ensure you have the latest GitHub Copilot extension installed
2. Open the Command Palette (`Cmd/Ctrl + Shift + P`)
3. Run "GitHub Copilot: Open Agent Mode"
4. In the Copilot Chat panel, click the tools icon to access MCP configuration
5. Add your MCP server configuration:

```json
{
  "servers": {
    "strings-admin": {
      "command": "npx",
      "args": ["@duda-co/mcp-strings-admin"]
    }
  }
}
```

#### JetBrains IDEs (IntelliJ, PyCharm, etc.)

1. Open the GitHub Copilot Chat panel (click the Copilot icon in the right sidebar)
2. Click the **Agent** tab at the top of the chat panel
3. Click the tools icon in the Copilot Chat box
4. Configure your MCP server in the settings
5. Use natural language commands to interact with the strings-admin tools

#### Usage in GitHub Copilot

Once configured, you can use the MCP server in Copilot Chat by:

1. Opening Copilot Chat and selecting **Agent** mode
2. Using natural language commands like:
   - "Show me all available string scopes using the strings-admin tool"
   - "Create a new string key for a login button using strings-admin"
   - "List scopes and create an error message string"

**Important Notes**: 
- MCP support in GitHub Copilot requires Agent Mode, which is available in supported IDEs
- The exact configuration steps may vary between IDE versions
- Refer to the [official GitHub Copilot MCP documentation](https://docs.github.com/en/copilot/customizing-copilot/using-model-context-protocol/using-the-github-mcp-server) for the latest setup instructions

## Available Tools

### `duda_strings_admin_get_all_scopes`
- **Purpose**: Lists all available scopes where strings can be created
- **Parameters**: None
- **Returns**: JSON array of scopes with `value` (scope name) and `shouldTranslate` properties
- **Usage**: Always call this first to see available scopes before creating strings

### `duda_strings_admin_create_new_string_key`
- **Purpose**: Creates new translation string in a specific scope
- **Workflow**: 
  1. First call `get_all_scopes` to see available scope options
  2. Choose appropriate scope from the results
  3. Create string key using the scope `value` field as `scopeValue`
- **Parameters**:
  - `key` (string, 1-200 chars): String identifier with required format:
    - **Must start with `ui.ed.` prefix**
    - **Format**: `ui.ed.{category}.{specific_name}`
    - **Examples**: `ui.ed.button.save`, `ui.ed.error.invalid_email`, `ui.ed.modal.confirm_delete`
    - **Suffix is developer choice** - verify naming with your team
  - `value` (string, 1-1000 chars): The actual display text
  - `shouldTranslate` (boolean): Whether this string needs translation
  - `scopeValue` (string, 1-50 chars): Use the `value` field from `get_all_scopes` response
- **Returns**: Success confirmation

## Usage Examples

Ask Claude:
- "Show me all string scopes"
- "Create string key 'ui.ed.button.submit' with value 'Submit Form' in 'checkout' scope, translatable"
- "List scopes then create a login error message"

## Troubleshooting

- **Connection errors**: Check `STRINGS_ADMIN_HOST` and network access
- **Authentication**: Verify GitHub token has `read:packages` permission
- **Tools not appearing**: 
  - **Claude Desktop**: Check config file syntax and restart Claude Desktop
  - **Cursor**: Verify MCP server configuration in settings and restart Cursor
  - **GitHub Copilot**: Ensure you're in Agent Mode, have a compatible IDE version, and MCP server is properly configured
- **Command not found**: Make sure the package is properly installed (`npm install -g @duda-co/mcp-strings-admin`)
- **Permission errors**: Check that your environment has the necessary permissions to run the MCP server 