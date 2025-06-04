# Resend MCP Server

A complete Model Context Protocol (MCP) server for the Resend API, providing access to all Resend endpoints through Claude Desktop or any MCP-compatible client.

## Features

This MCP server implements **all** Resend API endpoints:

### Email Operations
- **Send Email** - Send single emails with attachments, scheduling, and custom headers
- **Send Batch Emails** - Send up to 100 emails in a single request
- **Get Email** - Retrieve email details and status
- **Update Email** - Modify scheduled emails
- **Cancel Email** - Cancel scheduled emails

### Domain Management
- **Create Domain** - Add new sending domains
- **List Domains** - View all configured domains
- **Get Domain** - Retrieve domain details and DNS records
- **Update Domain** - Configure tracking and TLS settings
- **Delete Domain** - Remove domains
- **Verify Domain** - Trigger domain verification

### API Key Management
- **Create API Key** - Generate new API keys with permissions
- **List API Keys** - View all API keys
- **Delete API Key** - Revoke API keys

### Contact & Audience Management
- **Create Audience** - Create contact lists
- **List Audiences** - View all audiences
- **Get/Delete Audience** - Manage specific audiences
- **Create Contact** - Add contacts to audiences
- **List Contacts** - View audience contacts
- **Get/Update/Delete Contact** - Manage individual contacts

### Broadcast Campaigns
- **Create Broadcast** - Design email campaigns
- **List Broadcasts** - View all broadcasts
- **Get Broadcast** - Retrieve broadcast details
- **Send Broadcast** - Send or schedule broadcasts
- **Delete Broadcast** - Remove draft broadcasts

## Installation

### Quick Install via NPX (Recommended)

You can run the Resend MCP server directly without installation:

```bash
npx resend-mcp-server --key YOUR_RESEND_API_KEY
```

### Global Installation via NPM

```bash
npm install -g resend-mcp-server
```

Then run:
```bash
resend-mcp-server --key YOUR_RESEND_API_KEY
```

### Local Installation

1. Clone the repository:
```bash
git clone https://github.com/199-biotechnologies/mcp-send-email.git
cd mcp-send-email
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### Claude Desktop Setup

Add the following to your Claude Desktop configuration file:

**Using NPX (Recommended):**
```json
{
  "mcpServers": {
    "resend": {
      "command": "npx",
      "args": [
        "resend-mcp-server",
        "--key",
        "YOUR_RESEND_API_KEY"
      ]
    }
  }
}
```

**Using Global Installation:**
```json
{
  "mcpServers": {
    "resend": {
      "command": "resend-mcp-server",
      "args": [
        "--key",
        "YOUR_RESEND_API_KEY"
      ]
    }
  }
}
```

**Using Local Installation:**
```json
{
  "mcpServers": {
    "resend": {
      "command": "node",
      "args": [
        "/path/to/mcp-send-email/build/index.js",
        "--key",
        "YOUR_RESEND_API_KEY"
      ]
    }
  }
}
```

### Configuration Options

The server accepts the following command-line arguments:

- `--key` - Your Resend API key (required)
- `--sender` - Default sender email address (optional)
- `--reply-to` - Default reply-to email addresses (optional, comma-separated)

You can also use environment variables:
- `RESEND_API_KEY` - Your Resend API key
- `SENDER_EMAIL_ADDRESS` - Default sender email
- `REPLY_TO_EMAIL_ADDRESSES` - Default reply-to addresses (comma-separated)

### Finding Your Configuration File

The Claude Desktop configuration file location varies by platform:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

## Usage Examples

Once configured, you can use natural language to interact with the Resend API through Claude:

### Sending Emails
- "Send an email to user@example.com with subject 'Hello' and body 'Test message'"
- "Send a batch of emails to multiple recipients"
- "Schedule an email for tomorrow at 10am"

### Managing Domains
- "List all my Resend domains"
- "Add example.com as a new sending domain"
- "Enable click tracking for my domain"

### Contact Management
- "Create a new audience called 'Newsletter Subscribers'"
- "Add john@example.com to my newsletter audience"
- "List all contacts in my audience"

### API Key Management
- "Create a new API key with sending access only"
- "List all my API keys"

## Security Notes

- Never commit your API key to version control
- Use environment variables or secure credential management for production
- The server only exposes functionality through the MCP protocol
- All API operations require valid authentication

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run locally
node build/index.js --key YOUR_API_KEY
```

### Testing

You can test the server using the MCP inspector or by configuring it in Claude Desktop.

## Troubleshooting

### Common Issues

1. **"No API key provided" error**
   - Ensure you've set the `--key` argument or `RESEND_API_KEY` environment variable

2. **Permission errors with NPX**
   - Try clearing the NPX cache: `npx clear-npx-cache`
   - Or install globally: `npm install -g resend-mcp-server`

3. **Server not appearing in Claude**
   - Check your configuration file syntax
   - Restart Claude Desktop after configuration changes
   - Verify the path to the executable is correct

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/199-biotechnologies/mcp-send-email/issues).

## Acknowledgments

Built with:
- [Model Context Protocol SDK](https://github.com/anthropics/mcp)
- [Resend Node.js SDK](https://github.com/resend/resend-node)