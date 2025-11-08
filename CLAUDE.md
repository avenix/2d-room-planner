# 2D Room Planner - Codebase Summary

## Core Files

### src/main.tsx
React application entry point that renders the App component into the DOM.

### src/App.tsx
Main application orchestrator managing:
- Project state and CRUD operations
- Element selection and manipulation (lines, rectangles, circles, doors, text)
- Undo/redo history with keyboard shortcuts
- Theme switching (light/dark)
- Project import/export functionality
- Routing between project list and canvas views

### src/types.ts
TypeScript type definitions for:
- Canvas element types (LineElement, RectangleElement, TextElement, DoorElement, CircleElement)
- Project structure with elements, scaling factors, and view transforms
- Theme and app state types

### src/storageService.ts
LocalStorage persistence layer providing:
- Project save/load with date serialization
- Theme preferences storage
- Project import/export to JSON
- File download functionality

## Components

### src/components/ProjectListView.tsx
Grid view displaying all projects with:
- Project cards showing name, dates, element count
- Create new project button
- Delete project with confirmation
- Theme toggle

### src/components/CanvasView.tsx
Interactive drawing canvas (1760 lines) implementing:
- Tool system (select, line, rectangle, circle, door, text)
- Pan and zoom with mouse wheel
- Element drawing and manipulation with drag handles
- Rotation and scaling transformations
- Multi-select with shift-click and box selection
- Copy/paste and duplicate operations
- Keyboard shortcuts for navigation and editing
- Door snapping to walls and lines
- Grid background rendering
- Inline text editing
- Project settings modal

### src/components/PropertiesPanel.tsx
Collapsible side panel for editing selected elements:
- Position controls (x, y in cm)
- Color and opacity settings
- Stroke width adjustment
- Type-specific properties (dimensions, font, rotation)
- Multi-selection support showing common properties
- Delete element button

## Key Features
- Real-time dimension display with customizable units (pixels to cm conversion)
- Constraint-based door placement along walls
- Element labeling system
- Project-level settings (label font size, pixels per cm ratio)
- Persistent view transforms per project
