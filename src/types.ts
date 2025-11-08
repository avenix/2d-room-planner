export type ElementType = 'line' | 'rectangle' | 'text' | 'door' | 'circle';

export type Theme = 'light' | 'dark';

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  color: string;
  fillColor: string;
  opacity?: number;
  strokeWidth: number;
  hideDimensions?: boolean;
  rotation?: number;
  text?: string;
  locked?: boolean;
}

export interface LineElement extends BaseElement {
  type: 'line';
  endX: number;
  endY: number;
  lengthCm: number;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  width: number;
  height: number;
  widthCm: number;
  heightCm: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string;
}

export interface DoorElement extends BaseElement {
  type: 'door';
  width: number;
  attachedToLine?: string;
  attachedToRectangle?: string;
  attachmentSide?: 'top' | 'bottom' | 'left' | 'right';
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  radius: number;
  radiusCm: number;
}

export type CanvasElement = LineElement | RectangleElement | TextElement | DoorElement | CircleElement;

export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  elements: CanvasElement[];
  pixelsPerCm: number;
  labelFontSize?: number;
  viewTransform?: ViewTransform;
}

export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface AppState {
  projects: Project[];
  currentProjectId: string | null;
  selectedElementId: string | null;
  tool: 'select' | 'line' | 'rectangle' | 'text' | 'door' | 'circle';
  theme: Theme;
  viewTransform: ViewTransform;
}
