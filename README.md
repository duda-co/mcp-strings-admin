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

## Claude Desktop Setup

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
- **Tools not appearing**: Check Claude config file syntax and restart Claude Desktop 