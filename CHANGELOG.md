# Changelog

All notable changes to Room21 will be documented in this file.

## [4.1] - 2025-07-23
### Added
- 🖼 Added Screenshot preview file: [Screenshots.md](https://github.com/NotYarazi/room21/blob/main/brand/Screenshots.md)

### Security
- 🔒 Updated Security/User Privacy Policy: [Security.md](https://github.com/NotYarazi/room21/blob/main/SECURITY.md)
  
### Fixed
- Fixed insecure setting in the middle ware [#9f0f7e7](https://github.com/NotYarazi/room21/commit/9f0f7e72016544434fff4e9f2e745682585e72cb)
- Fixed Insecure random generation [#74d2a4c](https://github.com/NotYarazi/room21/commit/74d2a4cd124e7d2506c07b1a7615cdaf477480ce) 
- Fixed Rate limits in the server side [#7592fc5](https://github.com/NotYarazi/room21/commit/7592fc5ff817e03c8ade1ec5a952a7526b524fd6)
- Fixed Client-side cross-site scripting vulnerability [#f5594d8](https://github.com/NotYarazi/room21/commit/f5594d825a54830ee6611c52cc73ad41787bbafb)

---
## [4.0] - 2025-07-22

### Added
- 🎨 Complete UI redesign with Copilot-inspired glassmorphism theme
- 🔒 Enhanced security with improved input sanitization
- 💬 Better message handling and real-time communication
- 📱 Improved mobile support and responsive design
- ⚡ Performance optimizations and code refactoring
- 🛠 Enhanced error handling and reconnection logic
- 🎵 Sound notifications for user mentions
- 📋 Command system improvements (`/help`, `/nick`, `/users`, `/clear`)
- 🔐 HTTPS/WSS enforcement for secure connections
- 📝 Character counter with visual feedback (500 char limit)

### Changed
- 🏷 Complete project rebrand from previous version to Room21
- 🎨 Modern glassmorphism design system
- 💻 Improved code structure and organization
- 🔧 Better configuration and environment handling

### Fixed
- 🐛 WebSocket connection stability issues
- 🔄 Auto-reconnection functionality
- 📱 Mobile device compatibility
- 🎯 Message delivery reliability
- 🔒 Security vulnerabilities

### Security
- 🛡 Enhanced input validation and XSS protection
- 🚫 Rate limiting implementation (1 message per second)
- 🔐 Secure session management
- 🛡 Content Security Policy headers
- 🔒 CORS policy configuration

---
## [3.x] - Previous Versions

### Added
- Basic real-time chat functionality
- WebSocket implementation
- Simple user interface
- Anonymous messaging

### Features from Earlier Versions
- Real-time messaging via WebSockets
- Anonymous user system
- Basic command support
- Simple HTML/CSS interface
- Session-based user management

---

## Future Roadmap

### Planned Features
- [ ] Private messaging between users
- [ ] Multiple chat rooms/channels
- [ ] File sharing capabilities
- [ ] Voice message support
- [ ] Enhanced moderation tools
- [ ] Optional user authentication
- [ ] Database integration for persistence
- [ ] Mobile application versions
- [ ] Advanced emoji and reaction system
- [ ] Message search functionality

### Under Consideration
- [ ] Video calling integration
- [ ] Screen sharing
- [ ] Customizable themes
- [ ] Plugin system
- [ ] API for third-party integrations

---

*Note: This changelog follows semantic versioning. Major version changes (X.0.0) indicate breaking changes, minor versions (x.Y.0) add new features, and patch versions (x.y.Z) include bug fixes and improvements.*
