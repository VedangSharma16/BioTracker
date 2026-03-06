## Packages
framer-motion | Page transitions and sleek entry animations
recharts | Dashboard analytics charts and data visualization
date-fns | Human-readable date formatting
react-hook-form | Form state management (installed but needed explicitly for complex forms)
@hookform/resolvers | Zod validation for forms (installed)
lucide-react | Icons (installed)

## Notes
The application forces a dark theme design system via index.css as requested for the "dark theme hospital dashboard".
User role controls access to 'Add' action buttons (only visible to 'admin').
Authentication relies on the /api/me endpoint and httpOnly cookies.
