# Changelog

All notable changes to the Resend MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2025-01-14

### Added
- Update broadcast tool for modifying existing broadcasts
- Content type field support for email attachments
- Validation for maximum 50 recipients per email
- Validation for tag constraints (ASCII only, max 256 characters)

### Fixed
- Removed unsupported fields (scheduledAt, tags, attachments) from batch email endpoint
- Improved API compliance with official Resend documentation

### Changed
- Enhanced parameter validation to match API requirements
- Updated documentation to reflect new update-broadcast functionality

## [2.0.0] - 2025-01-06

### Added
- Complete implementation of ALL Resend API endpoints
- Email batch sending (up to 100 emails)
- Email management: get, update, cancel scheduled emails
- Full domain management: create, list, get, update, delete, verify
- API key management: create with permissions, list, delete
- Contact and audience management: full CRUD operations
- Broadcast campaigns: create, send, schedule, manage
- NPM/NPX support for easy installation
- Comprehensive documentation and examples
- Support for file attachments, custom headers, and email tags
- License file (MIT)

### Changed
- Package name to resend-mcp-server for NPM publishing
- Server name to "resend-mcp" for clarity
- Improved error handling and response formatting
- Enhanced TypeScript types and schemas
- Major refactoring to support all API endpoints

### Technical
- Added support for all Resend API v2 endpoints
- Improved email sending with full attachment and header support
- Added proper NPM bin configuration for global installation
- Added shebang for direct execution
- Improved build process with proper permissions

## [1.0.0] - 2024-12-20

### Added
- Initial release
- Basic email sending functionality
- HTML email support
- Email scheduling capability
- Reply-to addressing
- CC and BCC support for email recipients
- Full request/response logging for improved debugging
- Natural language scheduling support