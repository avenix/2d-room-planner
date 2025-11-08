import React, { useRef, useEffect, useState } from 'react';
import { CanvasElement, ViewTransform, Point, Project, LineElement } from '../types';

interface CanvasViewProps {
  project: Project;
  selectedElementIds: string[];
  tool: 'select' | 'line' | 'rectangle' | 'text' | 'door' | 'circle';
  theme: 'light' | 'dark';
  onAddElement: (element: CanvasElement) => void;
  onAddMultipleElements: (elements: CanvasElement[]) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>, skipHistory?: boolean) => void;
  onUpdateMultipleElements: (ids: string[], updates: Partial<CanvasElement>) => void;
  onSelectElements: (ids: string[]) => void;
  onDeleteElement: (id: string) => void;
  onDeleteMultipleElements: (ids: string[]) => void;
  onSetTool: (tool: 'select' | 'line' | 'rectangle' | 'text' | 'door' | 'circle') => void;
  onBackToProjects: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onUpdateProjectSettings: (settings: Partial<Project>) => void;
  onRenameProject: (name: string) => void;
  onSaveHistory: () => void;
  onToggleTheme: () => void;
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  project,
  selectedElementIds,
  tool,
  theme,
  onAddElement,
  onAddMultipleElements,
  onUpdateElement,
  onUpdateMultipleElements,
  onSelectElements,
  onDeleteElement,
  onDeleteMultipleElements,
  onSetTool,
  onBackToProjects,
  onExport,
  onImport,
  onUpdateProjectSettings,
  onRenameProject,
  onSaveHistory,
  onToggleTheme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewTransform, setViewTransform] = useState<ViewTransform>(
    project.viewTransform || {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    }
  );
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point>({ x: 0, y: 0 });
  const [tempElement, setTempElement] = useState<CanvasElement | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [dragReferenceId, setDragReferenceId] = useState<string | null>(null);
  const [elementStartPositions, setElementStartPositions] = useState<Map<string, { x: number; y: number; endX?: number; endY?: number }>>(new Map());
  const [doorOriginalRotation, setDoorOriginalRotation] = useState<number | undefined>(undefined);
  const [copiedElements, setCopiedElements] = useState<CanvasElement[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState(project.name);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const projectNameInputRef = useRef<HTMLInputElement>(null);
  const selectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [potentialSelection, setPotentialSelection] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [scaleHandle, setScaleHandle] = useState<'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null>(null);
  const [rotationStart, setRotationStart] = useState<number>(0);
  const [cursor, setCursor] = useState<string>('default');
  const [doorHoverSnap, setDoorHoverSnap] = useState<{ x: number; y: number; rotation: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const screenToCanvas = (screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (screenX - rect.left - viewTransform.offsetX) / viewTransform.scale,
      y: (screenY - rect.top - viewTransform.offsetY) / viewTransform.scale,
    };
  };

  const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const pixels = Math.sqrt(dx * dx + dy * dy);
    return pixels / project.pixelsPerCm;
  };

  const drawTextWithBackground = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    textColor: string,
    backgroundColor?: string
  ): void => {
    ctx.font = ctx.font;
    const metrics = ctx.measureText(text);
    const padding = 4 / viewTransform.scale;
    const bgHeight = parseInt(ctx.font) * 1.2;

    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(
        x - padding,
        y - bgHeight + padding,
        metrics.width + padding * 2,
        bgHeight
      );
    }

    ctx.strokeStyle = theme === 'dark' ? '#000000' : '#ffffff';
    ctx.lineWidth = 3 / viewTransform.scale;
    ctx.strokeText(text, x, y);

    ctx.fillStyle = textColor;
    ctx.fillText(text, x, y);
  };

  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const getElementBounds = (element: CanvasElement): { x: number; y: number; width: number; height: number; centerX: number; centerY: number } => {
    if (element.type === 'line') {
      const minX = Math.min(element.x, element.endX);
      const minY = Math.min(element.y, element.endY);
      const maxX = Math.max(element.x, element.endX);
      const maxY = Math.max(element.y, element.endY);
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (element.x + element.endX) / 2,
        centerY: (element.y + element.endY) / 2,
      };
    } else if (element.type === 'rectangle') {
      return {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        centerX: element.x + element.width / 2,
        centerY: element.y + element.height / 2,
      };
    } else if (element.type === 'text') {
      const scaledFontSize = element.fontSize / viewTransform.scale;
      const estimatedWidth = element.content.length * scaledFontSize * 0.6;
      return {
        x: element.x,
        y: element.y - scaledFontSize,
        width: estimatedWidth,
        height: scaledFontSize,
        centerX: element.x + estimatedWidth / 2,
        centerY: element.y - scaledFontSize / 2,
      };
    } else if (element.type === 'door') {
      const rotation = element.rotation || 0;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);

      const doorAngle = Math.PI / 6;
      const doorEndX = Math.cos(doorAngle) * element.width;
      const doorEndY = Math.sin(doorAngle) * element.width;

      const point1X = 0;
      const point1Y = 0;
      const point2X = element.width;
      const point2Y = 0;
      const point3X = element.width + doorEndX;
      const point3Y = doorEndY;

      const worldPoint1X = element.x + point1X * cos - point1Y * sin;
      const worldPoint1Y = element.y + point1X * sin + point1Y * cos;
      const worldPoint2X = element.x + point2X * cos - point2Y * sin;
      const worldPoint2Y = element.y + point2X * sin + point2Y * cos;
      const worldPoint3X = element.x + point3X * cos - point3Y * sin;
      const worldPoint3Y = element.y + point3X * sin + point3Y * cos;

      const minX = Math.min(worldPoint1X, worldPoint2X, worldPoint3X);
      const maxX = Math.max(worldPoint1X, worldPoint2X, worldPoint3X);
      const minY = Math.min(worldPoint1Y, worldPoint2Y, worldPoint3Y);
      const maxY = Math.max(worldPoint1Y, worldPoint2Y, worldPoint3Y);

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
      };
    } else if (element.type === 'circle') {
      return {
        x: element.x - element.radius,
        y: element.y - element.radius,
        width: element.radius * 2,
        height: element.radius * 2,
        centerX: element.x,
        centerY: element.y,
      };
    }
    return { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  };

  const checkHandleHit = (point: Point, handleX: number, handleY: number): boolean => {
    const handleSize = 8 / viewTransform.scale;
    return Math.abs(point.x - handleX) < handleSize && Math.abs(point.y - handleY) < handleSize;
  };

  const getScaleHandle = (point: Point, element: CanvasElement): 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null => {
    if (element.type === 'line' || element.type === 'door') return null;

    const bounds = getElementBounds(element);
    const { x, y, width, height, centerX, centerY } = bounds;
    const rotation = element.rotation || 0;

    const rotatePoint = (px: number, py: number, cx: number, cy: number, angle: number): { x: number; y: number } => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const dx = px - cx;
      const dy = py - cy;
      return {
        x: cx + dx * cos - dy * sin,
        y: cy + dx * sin + dy * cos,
      };
    };

    const handles: Array<{ x: number; y: number; type: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' }> = [
      { x, y, type: 'nw' },
      { x: x + width, y, type: 'ne' },
      { x, y: y + height, type: 'sw' },
      { x: x + width, y: y + height, type: 'se' },
      { x: x + width / 2, y, type: 'n' },
      { x: x + width / 2, y: y + height, type: 's' },
      { x, y: y + height / 2, type: 'w' },
      { x: x + width, y: y + height / 2, type: 'e' },
    ];

    for (const handle of handles) {
      const rotated = rotatePoint(handle.x, handle.y, centerX, centerY, rotation);
      if (checkHandleHit(point, rotated.x, rotated.y)) {
        return handle.type;
      }
    }

    return null;
  };

  const getRotationHandle = (point: Point, element: CanvasElement): boolean => {
    const bounds = getElementBounds(element);
    const rotation = element.rotation || 0;
    const rotateHandleY = bounds.y - 30 / viewTransform.scale;

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const dx = bounds.centerX - bounds.centerX;
    const dy = rotateHandleY - bounds.centerY;
    const rotatedX = bounds.centerX + dx * cos - dy * sin;
    const rotatedY = bounds.centerY + dx * sin + dy * cos;

    return checkHandleHit(point, rotatedX, rotatedY);
  };

  const getCursorForHandle = (handle: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null, rotation: number = 0): string => {
    if (!handle) return 'default';

    const angle = rotation * (180 / Math.PI);
    const cursors: Record<string, string> = {
      'n': 'ns-resize',
      's': 'ns-resize',
      'e': 'ew-resize',
      'w': 'ew-resize',
      'ne': 'nesw-resize',
      'sw': 'nesw-resize',
      'nw': 'nwse-resize',
      'se': 'nwse-resize',
    };

    const baseCursor = cursors[handle];
    const normalizedAngle = ((angle % 180) + 180) % 180;

    if (handle === 'n' || handle === 's') {
      if (normalizedAngle > 45 && normalizedAngle < 135) {
        return 'ew-resize';
      }
      return 'ns-resize';
    }

    if (handle === 'e' || handle === 'w') {
      if (normalizedAngle > 45 && normalizedAngle < 135) {
        return 'ns-resize';
      }
      return 'ew-resize';
    }

    if (handle === 'ne' || handle === 'sw') {
      if (normalizedAngle > 45 && normalizedAngle < 135) {
        return 'nwse-resize';
      }
      return 'nesw-resize';
    }

    if (handle === 'nw' || handle === 'se') {
      if (normalizedAngle > 45 && normalizedAngle < 135) {
        return 'nesw-resize';
      }
      return 'nwse-resize';
    }

    return baseCursor;
  };

  const updateCursor = (point: Point): void => {
    if (tool !== 'select' || selectedElementIds.length !== 1) {
      setCursor('default');
      return;
    }

    const selectedElement = project.elements.find(el => el.id === selectedElementIds[0]);
    if (!selectedElement) {
      setCursor('default');
      return;
    }

    if (getRotationHandle(point, selectedElement)) {
      setCursor('grab');
      return;
    }

    const handle = getScaleHandle(point, selectedElement);
    if (handle) {
      setCursor(getCursorForHandle(handle, selectedElement.rotation));
      return;
    }

    const clickedElement = findElementAt(point.x, point.y);
    if (clickedElement) {
      setCursor('move');
      return;
    }

    setCursor('default');
  };

  const findNearestLineOrWall = (point: Point): {
    x: number;
    y: number;
    rotation: number;
    distance: number;
    attachedToLine?: string;
    attachedToRectangle?: string;
    attachmentSide?: 'top' | 'bottom' | 'left' | 'right'
  } => {
    const snapDistance = 30 / viewTransform.scale;
    let nearestDist = Infinity;
    let nearestSnap: {
      x: number;
      y: number;
      rotation: number;
      distance: number;
      attachedToLine?: string;
      attachedToRectangle?: string;
      attachmentSide?: 'top' | 'bottom' | 'left' | 'right';
    } = { x: point.x, y: point.y, rotation: 0, distance: Infinity };

    const getClosestPointOnLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): { x: number; y: number } => {
      const A = px - x1;
      const B = py - y1;
      const C = x2 - x1;
      const D = y2 - y1;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      if (lenSq !== 0) param = dot / lenSq;

      let xx, yy;
      if (param < 0) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }

      return { x: xx, y: yy };
    };

    project.elements.forEach(element => {
      if (element.type === 'line') {
        const dist = pointToLineDistance(point.x, point.y, element.x, element.y, element.endX, element.endY);
        if (dist < snapDistance && dist < nearestDist) {
          const angle = Math.atan2(element.endY - element.y, element.endX - element.x);
          const closestPoint = getClosestPointOnLine(point.x, point.y, element.x, element.y, element.endX, element.endY);

          nearestDist = dist;
          nearestSnap = {
            x: closestPoint.x,
            y: closestPoint.y,
            rotation: angle,
            distance: dist,
            attachedToLine: element.id,
          };
        }
      } else if (element.type === 'rectangle') {
        const sides = [
          { x: element.x, y: element.y, endX: element.x + element.width, endY: element.y, side: 'top' as const },
          { x: element.x, y: element.y + element.height, endX: element.x + element.width, endY: element.y + element.height, side: 'bottom' as const },
          { x: element.x, y: element.y, endX: element.x, endY: element.y + element.height, side: 'left' as const },
          { x: element.x + element.width, y: element.y, endX: element.x + element.width, endY: element.y + element.height, side: 'right' as const },
        ];

        sides.forEach(({ x, y, endX, endY, side }) => {
          const dist = pointToLineDistance(point.x, point.y, x, y, endX, endY);
          if (dist < snapDistance && dist < nearestDist) {
            const closestPoint = getClosestPointOnLine(point.x, point.y, x, y, endX, endY);
            const rotation = Math.atan2(endY - y, endX - x);

            nearestDist = dist;
            nearestSnap = {
              x: closestPoint.x,
              y: closestPoint.y,
              rotation,
              distance: dist,
              attachedToRectangle: element.id,
              attachmentSide: side,
            };
          }
        });
      }
    });

    return nearestSnap;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>): void => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, viewTransform.scale * delta));

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newOffsetX = mouseX - (mouseX - viewTransform.offsetX) * (newScale / viewTransform.scale);
    const newOffsetY = mouseY - (mouseY - viewTransform.offsetY) * (newScale / viewTransform.scale);

    const newTransform = {
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    };

    setViewTransform(newTransform);
    onUpdateProjectSettings({ viewTransform: newTransform });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const point = screenToCanvas(e.clientX, e.clientY);

    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (tool === 'select' && selectedElementIds.length === 1) {
      const selectedElement = project.elements.find(el => el.id === selectedElementIds[0]);
      if (selectedElement && !selectedElement.locked) {
        if (getRotationHandle(point, selectedElement)) {
          setIsRotating(true);
          const bounds = getElementBounds(selectedElement);
          setRotationStart(Math.atan2(point.y - bounds.centerY, point.x - bounds.centerX));
          return;
        }

        const handle = getScaleHandle(point, selectedElement);
        if (handle) {
          setIsScaling(true);
          setScaleHandle(handle);
          setDrawStart(point);
          return;
        }
      }
    }

    if (tool === 'select') {
      const clickedElement = findElementAt(point.x, point.y);
      if (clickedElement) {
        if (e.shiftKey) {
          if (selectedElementIds.includes(clickedElement.id)) {
            onSelectElements(selectedElementIds.filter(id => id !== clickedElement.id));
          } else {
            onSelectElements([...selectedElementIds, clickedElement.id]);
          }
        } else if (!selectedElementIds.includes(clickedElement.id)) {
          onSelectElements([clickedElement.id]);
        }

        if (!clickedElement.locked) {
          setIsDragging(true);
          setDragReferenceId(clickedElement.id);
          setDragStart(point);

          const positions = new Map<string, { x: number; y: number; endX?: number; endY?: number }>();
          selectedElementIds.forEach(id => {
            const element = project.elements.find(e => e.id === id);
            if (element && !element.locked) {
              if (element.type === 'line') {
                positions.set(id, { x: element.x, y: element.y, endX: element.endX, endY: element.endY });
              } else {
                positions.set(id, { x: element.x, y: element.y });
              }
            }
          });
          setElementStartPositions(positions);

          if (clickedElement.type === 'door') {
            setDoorOriginalRotation(clickedElement.rotation);
          }
        }
      } else {
        if (!e.shiftKey) {
          onSelectElements([]);
        }
        setDrawStart(point);
        setPotentialSelection(true);
      }
    } else if (tool === 'line' || tool === 'rectangle' || tool === 'circle') {
      setIsDrawing(true);
      setDrawStart(point);
    } else if (tool === 'text') {
      const textElement: CanvasElement = {
        id: generateId(),
        type: 'text',
        x: point.x,
        y: point.y,
        content: 'Text',
        fontSize: 16,
        fontFamily: 'Arial',
        color: theme === 'dark' ? '#ffffff' : '#000000',
        fillColor: theme === 'dark' ? '#222222' : '#f5f5f5',
        strokeWidth: 10,
      };
      onAddElement(textElement);
      onSetTool('select');
    } else if (tool === 'door') {
      const snappedPosition = findNearestLineOrWall(point);
      const doorElement: CanvasElement = {
        id: generateId(),
        type: 'door',
        x: snappedPosition.x,
        y: snappedPosition.y,
        width: 80 * project.pixelsPerCm,
        rotation: snappedPosition.rotation,
        color: theme === 'dark' ? '#ffffff' : '#000000',
        fillColor: theme === 'dark' ? '#222222' : '#f5f5f5',
        strokeWidth: 10,
        attachedToLine: snappedPosition.attachedToLine,
        attachedToRectangle: snappedPosition.attachedToRectangle,
        attachmentSide: snappedPosition.attachmentSide,
      };
      onAddElement(doorElement);
      onSetTool('select');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const point = screenToCanvas(e.clientX, e.clientY);

    if (!isPanning && !isRotating && !isScaling && !isDragging && !isDrawing && !isSelecting) {
      updateCursor(point);

      if (tool === 'door') {
        const snappedPosition = findNearestLineOrWall(point);
        const snapDistance = 30 / viewTransform.scale;

        if (snappedPosition.distance < snapDistance) {
          setDoorHoverSnap({
            x: snappedPosition.x,
            y: snappedPosition.y,
            rotation: snappedPosition.rotation,
          });
        } else {
          setDoorHoverSnap(null);
        }
      } else {
        setDoorHoverSnap(null);
      }
    }

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setViewTransform({
        ...viewTransform,
        offsetX: viewTransform.offsetX + dx,
        offsetY: viewTransform.offsetY + dy,
      });
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (isRotating && selectedElementIds.length === 1) {
      const selectedElement = project.elements.find(el => el.id === selectedElementIds[0]);
      if (selectedElement) {
        const bounds = getElementBounds(selectedElement);
        const currentAngle = Math.atan2(point.y - bounds.centerY, point.x - bounds.centerX);
        const rotationDelta = currentAngle - rotationStart;
        const currentRotation = selectedElement.rotation || 0;
        onUpdateElement(selectedElementIds[0], { rotation: currentRotation + rotationDelta }, true);
        setRotationStart(currentAngle);
      }
    } else if (isScaling && scaleHandle && selectedElementIds.length === 1) {
      const selectedElement = project.elements.find(el => el.id === selectedElementIds[0]);
      if (selectedElement && selectedElement.type === 'rectangle') {
        const dx = point.x - drawStart.x;
        const dy = point.y - drawStart.y;

        let newX = selectedElement.x;
        let newY = selectedElement.y;
        let newWidth = selectedElement.width;
        let newHeight = selectedElement.height;

        if (scaleHandle.includes('w')) {
          newX = selectedElement.x + dx;
          newWidth = selectedElement.width - dx;
        }
        if (scaleHandle.includes('e')) {
          newWidth = selectedElement.width + dx;
        }
        if (scaleHandle.includes('n')) {
          newY = selectedElement.y + dy;
          newHeight = selectedElement.height - dy;
        }
        if (scaleHandle.includes('s')) {
          newHeight = selectedElement.height + dy;
        }

        if (newWidth > 10 && newHeight > 10) {
          onUpdateElement(selectedElementIds[0], {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
          }, true);
          setDrawStart(point);
        }
      } else if (selectedElement && selectedElement.type === 'text') {
        const dx = point.x - drawStart.x;
        const dy = point.y - drawStart.y;

        if (scaleHandle === 'e' || scaleHandle === 'ne' || scaleHandle === 'se') {
          const newFontSize = Math.max(8, selectedElement.fontSize + (dx + dy) / 2);
          onUpdateElement(selectedElementIds[0], { fontSize: newFontSize }, true);
          setDrawStart(point);
        }
      }
    } else if (isDragging && selectedElementIds.length > 0 && dragReferenceId) {
      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;

      elementStartPositions.forEach((startPos, id) => {
        const element = project.elements.find(e => e.id === id);
        if (!element || element.locked) return;

        if (element.type === 'line' && startPos.endX !== undefined && startPos.endY !== undefined) {
          onUpdateElement(id, {
            x: startPos.x + dx,
            y: startPos.y + dy,
            endX: startPos.endX + dx,
            endY: startPos.endY + dy,
          }, true);
        } else if (element.type === 'door' && id === dragReferenceId) {
          const primaryElement = element;
          let newX = startPos.x + dx;
          let newY = startPos.y + dy;
          let rotation = primaryElement.rotation;

          if (elementStartPositions.size === 1) {
            if (primaryElement.attachedToLine) {
              const attachedLine = project.elements.find(e => e.id === primaryElement.attachedToLine && e.type === 'line');
              if (attachedLine && attachedLine.type === 'line') {
                const lineVecX = attachedLine.endX - attachedLine.x;
                const lineVecY = attachedLine.endY - attachedLine.y;
                const lineLength = Math.sqrt(lineVecX * lineVecX + lineVecY * lineVecY);
                const lineUnitX = lineVecX / lineLength;
                const lineUnitY = lineVecY / lineLength;

                const toPointX = point.x - attachedLine.x;
                const toPointY = point.y - attachedLine.y;
                const projection = toPointX * lineUnitX + toPointY * lineUnitY;
                const clampedProjection = Math.max(0, Math.min(lineLength, projection));

                newX = attachedLine.x + clampedProjection * lineUnitX;
                newY = attachedLine.y + clampedProjection * lineUnitY;
                rotation = Math.atan2(lineVecY, lineVecX);
              }
            } else if (primaryElement.attachedToRectangle) {
              const attachedRect = project.elements.find(e => e.id === primaryElement.attachedToRectangle && e.type === 'rectangle');
              if (attachedRect && attachedRect.type === 'rectangle' && primaryElement.attachmentSide) {
                let lineX1: number, lineY1: number, lineX2: number, lineY2: number;

                switch (primaryElement.attachmentSide) {
                  case 'top':
                    lineX1 = attachedRect.x;
                    lineY1 = attachedRect.y;
                    lineX2 = attachedRect.x + attachedRect.width;
                    lineY2 = attachedRect.y;
                    break;
                  case 'bottom':
                    lineX1 = attachedRect.x;
                    lineY1 = attachedRect.y + attachedRect.height;
                    lineX2 = attachedRect.x + attachedRect.width;
                    lineY2 = attachedRect.y + attachedRect.height;
                    break;
                  case 'left':
                    lineX1 = attachedRect.x;
                    lineY1 = attachedRect.y;
                    lineX2 = attachedRect.x;
                    lineY2 = attachedRect.y + attachedRect.height;
                    break;
                  case 'right':
                    lineX1 = attachedRect.x + attachedRect.width;
                    lineY1 = attachedRect.y;
                    lineX2 = attachedRect.x + attachedRect.width;
                    lineY2 = attachedRect.y + attachedRect.height;
                    break;
                }

                const lineVecX = lineX2 - lineX1;
                const lineVecY = lineY2 - lineY1;
                const lineLength = Math.sqrt(lineVecX * lineVecX + lineVecY * lineVecY);
                const lineUnitX = lineVecX / lineLength;
                const lineUnitY = lineVecY / lineLength;

                const toPointX = point.x - lineX1;
                const toPointY = point.y - lineY1;
                const projection = toPointX * lineUnitX + toPointY * lineUnitY;
                const clampedProjection = Math.max(0, Math.min(lineLength, projection));

                newX = lineX1 + clampedProjection * lineUnitX;
                newY = lineY1 + clampedProjection * lineUnitY;
                rotation = Math.atan2(lineVecY, lineVecX);
              }
            } else {
              const snappedPosition = findNearestLineOrWall(point);
              const snapDistance = 30 / viewTransform.scale;

              if (snappedPosition.distance < snapDistance) {
                newX = snappedPosition.x;
                newY = snappedPosition.y;
                rotation = snappedPosition.rotation;
              } else {
                rotation = doorOriginalRotation;
              }
            }
          }

          onUpdateElement(id, { x: newX, y: newY, rotation }, true);
        } else {
          onUpdateElement(id, {
            x: startPos.x + dx,
            y: startPos.y + dy,
          }, true);
        }
      });
    } else if (potentialSelection || isSelecting) {
      const distance = Math.sqrt(
        Math.pow(point.x - drawStart.x, 2) + Math.pow(point.y - drawStart.y, 2)
      );

      if (potentialSelection && distance > 5) {
        setPotentialSelection(false);
        setIsSelecting(true);
      }

      if (isSelecting) {
        const width = point.x - drawStart.x;
        const height = point.y - drawStart.y;
        setSelectionBox({
          x: Math.min(drawStart.x, point.x),
          y: Math.min(drawStart.y, point.y),
          width: Math.abs(width),
          height: Math.abs(height),
        });
      }
    } else if (isDrawing) {
      if (tool === 'line') {
        const lengthCm = calculateDistance(drawStart.x, drawStart.y, point.x, point.y);
        const lineElement: CanvasElement = {
          id: generateId(),
          type: 'line',
          x: drawStart.x,
          y: drawStart.y,
          endX: point.x,
          endY: point.y,
          lengthCm,
          color: theme === 'dark' ? '#ffffff' : '#000000',
          fillColor: theme === 'dark' ? '#222222' : '#f5f5f5',
          strokeWidth: 10,
        };
        setTempElement(lineElement);
      } else if (tool === 'rectangle') {
        const width = Math.abs(point.x - drawStart.x);
        const height = Math.abs(point.y - drawStart.y);
        const x = Math.min(drawStart.x, point.x);
        const y = Math.min(drawStart.y, point.y);
        const widthCm = width / project.pixelsPerCm;
        const heightCm = height / project.pixelsPerCm;

        const rectElement: CanvasElement = {
          id: generateId(),
          type: 'rectangle',
          x,
          y,
          width,
          height,
          widthCm,
          heightCm,
          color: theme === 'dark' ? '#ffffff' : '#000000',
          fillColor: theme === 'dark' ? '#222222' : '#f5f5f5',
          strokeWidth: 10,
        };
        setTempElement(rectElement);
      } else if (tool === 'circle') {
        const dx = point.x - drawStart.x;
        const dy = point.y - drawStart.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const radiusCm = radius / project.pixelsPerCm;

        const circleElement: CanvasElement = {
          id: generateId(),
          type: 'circle',
          x: drawStart.x,
          y: drawStart.y,
          radius,
          radiusCm,
          color: theme === 'dark' ? '#ffffff' : '#000000',
          fillColor: theme === 'dark' ? '#222222' : '#f5f5f5',
          strokeWidth: 10,
        };
        setTempElement(circleElement);
      }
    }
  };

  const handleMouseUp = (): void => {
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
      selectionTimeoutRef.current = null;
    }

    if (isPanning) {
      setIsPanning(false);
    } else if (isRotating) {
      setIsRotating(false);
      onSaveHistory();
    } else if (isScaling) {
      setIsScaling(false);
      setScaleHandle(null);
      onSaveHistory();
    } else if (isDragging) {
      setIsDragging(false);
      setDragReferenceId(null);
      setElementStartPositions(new Map());
      setDoorOriginalRotation(undefined);
      onSaveHistory();
    } else if (potentialSelection) {
      setPotentialSelection(false);
    } else if (isSelecting && selectionBox) {
      const isPointInBox = (x: number, y: number, box: { x: number; y: number; width: number; height: number }): boolean => {
        return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
      };

      const getRotatedCorners = (x: number, y: number, width: number, height: number, rotation: number, centerX: number, centerY: number): Array<{ x: number; y: number }> => {
        const corners = [
          { x, y },
          { x: x + width, y },
          { x, y: y + height },
          { x: x + width, y: y + height },
        ];

        return corners.map(corner => {
          const cos = Math.cos(rotation);
          const sin = Math.sin(rotation);
          const dx = corner.x - centerX;
          const dy = corner.y - centerY;
          return {
            x: centerX + dx * cos - dy * sin,
            y: centerY + dx * sin + dy * cos,
          };
        });
      };

      const elementsInBox = project.elements.filter(element => {
        if (element.type === 'line') {
          return (
            (element.x >= selectionBox.x && element.x <= selectionBox.x + selectionBox.width &&
             element.y >= selectionBox.y && element.y <= selectionBox.y + selectionBox.height) ||
            (element.endX >= selectionBox.x && element.endX <= selectionBox.x + selectionBox.width &&
             element.endY >= selectionBox.y && element.endY <= selectionBox.y + selectionBox.height)
          );
        } else if (element.type === 'rectangle') {
          const rotation = element.rotation || 0;
          const centerX = element.x + element.width / 2;
          const centerY = element.y + element.height / 2;
          const corners = getRotatedCorners(element.x, element.y, element.width, element.height, rotation, centerX, centerY);
          return corners.some(corner => isPointInBox(corner.x, corner.y, selectionBox));
        } else if (element.type === 'text') {
          const rotation = element.rotation || 0;
          const scaledFontSize = element.fontSize / viewTransform.scale;
          const estimatedWidth = element.content.length * scaledFontSize * 0.6;
          const corners = getRotatedCorners(element.x, element.y - scaledFontSize, estimatedWidth, scaledFontSize, rotation, element.x, element.y);
          return corners.some(corner => isPointInBox(corner.x, corner.y, selectionBox));
        } else if (element.type === 'circle') {
          return (
            element.x - element.radius < selectionBox.x + selectionBox.width &&
            element.x + element.radius > selectionBox.x &&
            element.y - element.radius < selectionBox.y + selectionBox.height &&
            element.y + element.radius > selectionBox.y
          );
        } else if (element.type === 'door') {
          const rotation = element.rotation || 0;
          const cos = Math.cos(rotation);
          const sin = Math.sin(rotation);
          const point1X = element.x;
          const point1Y = element.y;
          const point2X = element.x + element.width * cos;
          const point2Y = element.y + element.width * sin;
          return isPointInBox(point1X, point1Y, selectionBox) || isPointInBox(point2X, point2Y, selectionBox);
        }
        return false;
      });

      onSelectElements(elementsInBox.map(e => e.id));
      setIsSelecting(false);
      setSelectionBox(null);
    } else if (isDrawing && tempElement) {
      onAddElement(tempElement);
      setTempElement(null);
      setIsDrawing(false);
      onSetTool('select');
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (tool !== 'select') return;

    const point = screenToCanvas(e.clientX, e.clientY);
    const clickedElement = findElementAt(point.x, point.y);

    if (clickedElement) {
      setEditingTextId(clickedElement.id);
      onSelectElements([clickedElement.id]);
      setTimeout(() => textInputRef.current?.focus(), 0);
    }
  };

  const findElementAt = (x: number, y: number): CanvasElement | null => {
    let lockedMatch: CanvasElement | null = null;

    for (let i = project.elements.length - 1; i >= 0; i--) {
      const element = project.elements[i];
      let isMatch = false;

      if (element.type === 'line') {
        const dist = pointToLineDistance(x, y, element.x, element.y, element.endX, element.endY);
        if (dist < 10 / viewTransform.scale) isMatch = true;
      } else if (element.type === 'rectangle') {
        const rotation = element.rotation || 0;
        const centerX = element.x + element.width / 2;
        const centerY = element.y + element.height / 2;

        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);
        const dx = x - centerX;
        const dy = y - centerY;
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        const halfWidth = element.width / 2;
        const halfHeight = element.height / 2;

        if (
          localX >= -halfWidth &&
          localX <= halfWidth &&
          localY >= -halfHeight &&
          localY <= halfHeight
        ) {
          isMatch = true;
        }
      } else if (element.type === 'text') {
        const rotation = element.rotation || 0;
        const scaledFontSize = element.fontSize / viewTransform.scale;
        const estimatedWidth = element.content.length * scaledFontSize * 0.6;

        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);
        const dx = x - element.x;
        const dy = y - element.y;
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        if (
          localX >= 0 &&
          localX <= estimatedWidth &&
          localY >= -scaledFontSize &&
          localY <= 0
        ) {
          isMatch = true;
        }
      } else if (element.type === 'door') {
        const rotation = element.rotation || 0;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const dx = x - element.x;
        const dy = y - element.y;
        const localX = dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;

        const mainLineHit = Math.abs(localY) <= 5 / viewTransform.scale && localX >= 0 && localX <= element.width;

        const doorAngle = Math.PI / 6;
        const doorEndX = element.width * Math.cos(doorAngle);
        const doorEndY = element.width * Math.sin(doorAngle);
        const doorLineDist = pointToLineDistance(localX, localY, element.width, 0, element.width + doorEndX, doorEndY);
        const doorLineHit = doorLineDist <= 5 / viewTransform.scale;

        if (mainLineHit || doorLineHit) {
          isMatch = true;
        }
      } else if (element.type === 'circle') {
        const dx = x - element.x;
        const dy = y - element.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= element.radius) {
          isMatch = true;
        }
      }

      if (isMatch) {
        if (!element.locked) {
          return element;
        } else if (!lockedMatch) {
          lockedMatch = element;
        }
      }
    }
    return lockedMatch;
  };

  const pointToLineDistance = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const drawHandles = (ctx: CanvasRenderingContext2D, element: CanvasElement): void => {
    const bounds = getElementBounds(element);
    const handleSize = 6 / viewTransform.scale;
    const handleStroke = 2 / viewTransform.scale;
    const rotation = element.rotation || 0;

    ctx.save();

    if (element.locked) {
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = handleStroke;

      const crossSize = 8 / viewTransform.scale;
      const drawCross = (x: number, y: number): void => {
        ctx.beginPath();
        ctx.moveTo(x - crossSize, y - crossSize);
        ctx.lineTo(x + crossSize, y + crossSize);
        ctx.moveTo(x + crossSize, y - crossSize);
        ctx.lineTo(x - crossSize, y + crossSize);
        ctx.stroke();
      };

      const rotatePoint = (x: number, y: number, centerX: number, centerY: number, angle: number): { x: number; y: number } => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = x - centerX;
        const dy = y - centerY;
        return {
          x: centerX + dx * cos - dy * sin,
          y: centerY + dx * sin + dy * cos,
        };
      };

      if (element.type === 'rectangle' || element.type === 'text') {
        const { x, y, width, height, centerX, centerY } = bounds;

        const corners = [
          { x, y },
          { x: x + width, y },
          { x, y: y + height },
          { x: x + width, y: y + height },
        ];

        corners.forEach(point => {
          const rotated = rotatePoint(point.x, point.y, centerX, centerY, rotation);
          drawCross(rotated.x, rotated.y);
        });
      } else if (element.type === 'circle') {
        drawCross(bounds.centerX + bounds.width / 2, bounds.centerY);
        drawCross(bounds.centerX - bounds.width / 2, bounds.centerY);
        drawCross(bounds.centerX, bounds.centerY + bounds.height / 2);
        drawCross(bounds.centerX, bounds.centerY - bounds.height / 2);
      } else if (element.type === 'line') {
        drawCross(element.x, element.y);
        drawCross(element.endX, element.endY);
      } else if (element.type === 'door') {
        const rotated1 = rotatePoint(element.x, element.y, element.x, element.y, element.rotation || 0);
        const rotated2 = rotatePoint(element.x + element.width, element.y, element.x, element.y, element.rotation || 0);
        drawCross(rotated1.x, rotated1.y);
        drawCross(rotated2.x, rotated2.y);
      }

      ctx.restore();
      return;
    }

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = handleStroke;

    const drawHandle = (x: number, y: number): void => {
      ctx.fillRect(x - handleSize, y - handleSize, handleSize * 2, handleSize * 2);
      ctx.strokeRect(x - handleSize, y - handleSize, handleSize * 2, handleSize * 2);
    };

    const rotatePoint = (x: number, y: number, centerX: number, centerY: number, angle: number): { x: number; y: number } => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const dx = x - centerX;
      const dy = y - centerY;
      return {
        x: centerX + dx * cos - dy * sin,
        y: centerY + dx * sin + dy * cos,
      };
    };

    if (element.type === 'rectangle' || element.type === 'text') {
      const { x, y, width, height, centerX, centerY } = bounds;

      const corners = [
        { x, y },
        { x: x + width, y },
        { x, y: y + height },
        { x: x + width, y: y + height },
      ];

      const edges = [
        { x: x + width / 2, y },
        { x: x + width / 2, y: y + height },
        { x, y: y + height / 2 },
        { x: x + width, y: y + height / 2 },
      ];

      [...corners, ...edges].forEach(point => {
        const rotated = rotatePoint(point.x, point.y, centerX, centerY, rotation);
        drawHandle(rotated.x, rotated.y);
      });
    }

    const rotateHandleY = bounds.y - 30 / viewTransform.scale;
    const rotatedHandle = rotatePoint(bounds.centerX, rotateHandleY, bounds.centerX, bounds.centerY, rotation);

    ctx.beginPath();
    ctx.moveTo(bounds.centerX, bounds.centerY);
    ctx.lineTo(rotatedHandle.x, rotatedHandle.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rotatedHandle.x, rotatedHandle.y, handleSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rotatedHandle.x, rotatedHandle.y, handleSize * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = '#00aaff';
    ctx.stroke();

    ctx.restore();
  };

  const drawElement = (ctx: CanvasRenderingContext2D, element: CanvasElement, isSelected: boolean, labelFontSize: number, drawTextOnly: boolean = false): void => {
    ctx.save();

    if (element.type === 'line') {
      if (!drawTextOnly) {
        ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 1;
        ctx.strokeStyle = element.color;
        ctx.lineWidth = element.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(element.x, element.y);
        ctx.lineTo(element.endX, element.endY);
        ctx.stroke();

        if (isSelected) {
          ctx.strokeStyle = '#00aaff';
          ctx.lineWidth = 3 / viewTransform.scale;
          ctx.beginPath();
          ctx.arc(element.x, element.y, 5 / viewTransform.scale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(element.endX, element.endY, 5 / viewTransform.scale, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        if (!element.hideDimensions) {
          const midX = (element.x + element.endX) / 2;
          const midY = (element.y + element.endY) / 2;
          ctx.font = `${(project.labelFontSize || 12) / viewTransform.scale}px Arial`;
          const dimensionText = `${element.lengthCm.toFixed(1)} cm`;
          drawTextWithBackground(
            ctx,
            dimensionText,
            midX,
            midY - 5 / viewTransform.scale,
            theme === 'dark' ? '#ffffff' : '#000000'
          );
        }

        if (element.text) {
          const midX = (element.x + element.endX) / 2;
          const midY = (element.y + element.endY) / 2;
          ctx.font = `${labelFontSize / viewTransform.scale}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          drawTextWithBackground(
            ctx,
            element.text,
            midX,
            midY + 15 / viewTransform.scale,
            theme === 'dark' ? '#ffffff' : '#000000'
          );
          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
        }
      }
    } else if (element.type === 'rectangle') {
      ctx.save();

      const rotation = element.rotation || 0;
      if (rotation !== 0) {
        const centerX = element.x + element.width / 2;
        const centerY = element.y + element.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        ctx.translate(-centerX, -centerY);
      }

      if (!drawTextOnly) {
        if (element.fillColor !== 'transparent') {
          ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 1;
          ctx.fillStyle = element.fillColor;
          ctx.fillRect(element.x, element.y, element.width, element.height);
        }

        ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 1;
        ctx.strokeStyle = element.color;
        ctx.lineWidth = element.strokeWidth;
        ctx.strokeRect(element.x, element.y, element.width, element.height);

        if (isSelected) {
          ctx.strokeStyle = '#00aaff';
          ctx.lineWidth = 3 / viewTransform.scale;
          ctx.strokeRect(element.x, element.y, element.width, element.height);
        }
      } else {
        if (!element.hideDimensions) {
          ctx.globalAlpha = 1;
          ctx.font = `${(project.labelFontSize || 12) / viewTransform.scale}px Arial`;
          drawTextWithBackground(
            ctx,
            `${element.widthCm.toFixed(1)} cm`,
            element.x + element.width / 2 - 30 / viewTransform.scale,
            element.y - 5 / viewTransform.scale,
            theme === 'dark' ? '#ffffff' : '#000000'
          );
          drawTextWithBackground(
            ctx,
            `${element.heightCm.toFixed(1)} cm`,
            element.x - 50 / viewTransform.scale,
            element.y + element.height / 2,
            theme === 'dark' ? '#ffffff' : '#000000'
          );
        }

        if (element.text) {
          ctx.globalAlpha = 1;
          ctx.font = `${labelFontSize / viewTransform.scale}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          drawTextWithBackground(
            ctx,
            element.text,
            element.x + element.width / 2,
            element.y + element.height / 2,
            theme === 'dark' ? '#ffffff' : '#000000'
          );
          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
        }
      }

      ctx.restore();
    } else if (element.type === 'text') {
      if (!drawTextOnly) {
        ctx.save();

        const rotation = element.rotation || 0;
        if (rotation !== 0) {
          ctx.translate(element.x, element.y);
          ctx.rotate(rotation);
          ctx.translate(-element.x, -element.y);
        }

        ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 1;
        ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#000000';
        const scaledFontSize = element.fontSize / viewTransform.scale;
        ctx.font = `${scaledFontSize}px ${element.fontFamily}`;
        ctx.fillText(element.content, element.x, element.y);

        if (isSelected) {
          const metrics = ctx.measureText(element.content);
          ctx.strokeStyle = '#00aaff';
          ctx.lineWidth = 2 / viewTransform.scale;
          ctx.strokeRect(
            element.x,
            element.y - scaledFontSize,
            metrics.width,
            scaledFontSize
          );
        }

        ctx.restore();
      }
    } else if (element.type === 'door') {
      ctx.save();

      ctx.translate(element.x, element.y);
      if (element.rotation) {
        ctx.rotate(element.rotation);
      }

      if (!drawTextOnly) {
        ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 1;
        ctx.strokeStyle = element.color;
        ctx.lineWidth = element.strokeWidth;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(element.width, 0);
        ctx.stroke();

        const doorAngle = Math.PI / 6;
        const doorEndX = Math.cos(doorAngle) * element.width;
        const doorEndY = Math.sin(doorAngle) * element.width;

        ctx.beginPath();
        ctx.moveTo(element.width, 0);
        ctx.lineTo(element.width + doorEndX, doorEndY);
        ctx.stroke();

        ctx.setLineDash([5 / viewTransform.scale, 5 / viewTransform.scale]);
        ctx.beginPath();
        ctx.arc(element.width, 0, element.width, Math.PI, doorAngle, true);
        ctx.stroke();
        ctx.setLineDash([]);

        if (isSelected) {
          ctx.strokeStyle = '#00aaff';
          ctx.lineWidth = 3 / viewTransform.scale;
          ctx.beginPath();
          ctx.arc(0, 0, 5 / viewTransform.scale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(element.width, 0, 5 / viewTransform.scale, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        if (element.text) {
          ctx.globalAlpha = 1;
          ctx.font = `${labelFontSize / viewTransform.scale}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          drawTextWithBackground(
            ctx,
            element.text,
            element.width / 2,
            -10 / viewTransform.scale,
            theme === 'dark' ? '#ffffff' : '#000000'
          );
          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
        }
      }

      ctx.restore();
    } else if (element.type === 'circle') {
      if (!drawTextOnly) {
        if (element.fillColor !== 'transparent') {
          ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 1;
          ctx.fillStyle = element.fillColor;
          ctx.beginPath();
          ctx.arc(element.x, element.y, element.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 1;
        ctx.strokeStyle = element.color;
        ctx.lineWidth = element.strokeWidth;
        ctx.beginPath();
        ctx.arc(element.x, element.y, element.radius, 0, Math.PI * 2);
        ctx.stroke();

        if (isSelected) {
          ctx.strokeStyle = '#00aaff';
          ctx.lineWidth = 3 / viewTransform.scale;
          ctx.beginPath();
          ctx.arc(element.x, element.y, element.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        if (!element.hideDimensions) {
          ctx.globalAlpha = 1;
          ctx.font = `${(project.labelFontSize || 12) / viewTransform.scale}px Arial`;
          drawTextWithBackground(
            ctx,
            `${element.radiusCm.toFixed(1)} cm`,
            element.x + element.radius + 10 / viewTransform.scale,
            element.y,
            theme === 'dark' ? '#ffffff' : '#000000'
          );
        }

        if (element.text) {
          ctx.globalAlpha = 1;
          ctx.font = `${labelFontSize / viewTransform.scale}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          drawTextWithBackground(
            ctx,
            element.text,
            element.x,
            element.y,
            theme === 'dark' ? '#ffffff' : '#000000'
          );
          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
        }
      }
    }

    ctx.restore();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputField) {
        if (selectedElementIds.length > 0) {
          e.preventDefault();
          if (selectedElementIds.length === 1) {
            onDeleteElement(selectedElementIds[0]);
          } else {
            onDeleteMultipleElements(selectedElementIds);
          }
        }
      } else if (e.key === 'Escape') {
        if (showSettings) {
          setShowSettings(false);
        } else {
          onSelectElements([]);
          onSetTool('select');
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !isInputField) {
        e.preventDefault();
        onSelectElements(project.elements.map(el => el.id));
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !isInputField) {
        if (selectedElementIds.length > 0) {
          e.preventDefault();
          const elements = project.elements.filter(el => selectedElementIds.includes(el.id));
          setCopiedElements(elements);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'v' && !isInputField) {
        if (copiedElements.length > 0) {
          e.preventDefault();
          const newElements = copiedElements.map(copied => {
            const baseNew = {
              ...copied,
              id: generateId(),
              x: copied.x + 20,
              y: copied.y + 20,
            };

            if (copied.type === 'line') {
              return {
                ...baseNew,
                endX: copied.endX + 20,
                endY: copied.endY + 20,
              };
            }

            return baseNew;
          });

          onAddMultipleElements(newElements);
          onSelectElements(newElements.map(el => el.id));
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'd' && !isInputField) {
        if (selectedElementIds.length > 0) {
          e.preventDefault();
          const elements = project.elements.filter(el => selectedElementIds.includes(el.id));
          const newElements = elements.map(element => {
            const baseNew = {
              ...element,
              id: generateId(),
              x: element.x + 20,
              y: element.y + 20,
            };

            if (element.type === 'line') {
              return {
                ...baseNew,
                endX: element.endX + 20,
                endY: element.endY + 20,
              };
            }

            return baseNew;
          });

          onAddMultipleElements(newElements);
          onSelectElements(newElements.map(el => el.id));
        }
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isInputField) {
        if (selectedElementIds.length > 0) {
          e.preventDefault();

          const movementCm = e.shiftKey ? 1.0 : 0.5;
          const movementPixels = Math.round(movementCm * project.pixelsPerCm);

          let dx = 0;
          let dy = 0;

          if (e.key === 'ArrowLeft') dx = -movementPixels;
          if (e.key === 'ArrowRight') dx = movementPixels;
          if (e.key === 'ArrowUp') dy = -movementPixels;
          if (e.key === 'ArrowDown') dy = movementPixels;

          selectedElementIds.forEach(id => {
            const element = project.elements.find(el => el.id === id);
            if (!element) return;

            const updates: Partial<CanvasElement> = {
              x: Math.round(element.x + dx),
              y: Math.round(element.y + dy),
            };

            if (element.type === 'line') {
              (updates as Partial<LineElement>).endX = Math.round(element.endX + dx);
              (updates as Partial<LineElement>).endY = Math.round(element.endY + dy);
            }

            onUpdateElement(id, updates);
          });
        }
      } else if (!isInputField && selectedElementIds.length === 1 && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const element = project.elements.find(el => el.id === selectedElementIds[0]);
        if (element && element.type === 'text') {
          onUpdateElement(selectedElementIds[0], { content: e.key });
          setEditingTextId(selectedElementIds[0]);
          setTimeout(() => textInputRef.current?.focus(), 0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, copiedElements, onDeleteElement, onDeleteMultipleElements, onSelectElements, onSetTool, onUpdateElement, onUpdateMultipleElements, onAddElement, onAddMultipleElements, project, showSettings]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const newWidth = canvas.offsetWidth;
      const newHeight = canvas.offsetHeight;

      canvas.width = newWidth;
      canvas.height = newHeight;

      setCanvasSize({ width: newWidth, height: newHeight });
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.fillStyle = theme === 'dark' ? '#1a1a1a' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(viewTransform.offsetX, viewTransform.offsetY);
    ctx.scale(viewTransform.scale, viewTransform.scale);

    ctx.strokeStyle = theme === 'dark' ? '#333' : '#e0e0e0';
    ctx.lineWidth = 1 / viewTransform.scale;
    const gridSize = 50;

    const startX = Math.floor((-viewTransform.offsetX / viewTransform.scale) / gridSize) * gridSize;
    const endX = Math.ceil((canvas.width - viewTransform.offsetX) / viewTransform.scale / gridSize) * gridSize;
    const startY = Math.floor((-viewTransform.offsetY / viewTransform.scale) / gridSize) * gridSize;
    const endY = Math.ceil((canvas.height - viewTransform.offsetY) / viewTransform.scale / gridSize) * gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    project.elements.forEach((element) => {
      drawElement(ctx, element, selectedElementIds.includes(element.id), project.labelFontSize || 12, false);
    });

    if (tempElement) {
      drawElement(ctx, tempElement, false, project.labelFontSize || 12, false);
    }

    if (selectedElementIds.length === 1) {
      const selectedElement = project.elements.find(e => e.id === selectedElementIds[0]);
      if (selectedElement) {
        drawHandles(ctx, selectedElement);
      }
    }

    project.elements.forEach((element) => {
      drawElement(ctx, element, selectedElementIds.includes(element.id), project.labelFontSize || 12, true);
    });

    if (tempElement) {
      drawElement(ctx, tempElement, false, project.labelFontSize || 12, true);
    }

    if (selectionBox) {
      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 2 / viewTransform.scale;
      ctx.setLineDash([5 / viewTransform.scale, 5 / viewTransform.scale]);
      ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
      ctx.setLineDash([]);
    }

    if (doorHoverSnap && (tool === 'door' || (selectedElementIds.length === 1 && project.elements.find(e => e.id === selectedElementIds[0])?.type === 'door'))) {
      ctx.save();
      ctx.translate(doorHoverSnap.x, doorHoverSnap.y);
      ctx.rotate(doorHoverSnap.rotation);

      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 2 / viewTransform.scale;
      ctx.setLineDash([3 / viewTransform.scale, 3 / viewTransform.scale]);

      const doorWidth = 80;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(doorWidth, 0);
      ctx.stroke();

      ctx.fillStyle = '#00aaff';
      ctx.beginPath();
      ctx.arc(0, 0, 4 / viewTransform.scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.restore();
  }, [project, viewTransform, selectedElementIds, tempElement, selectionBox, theme, doorHoverSnap, canvasSize]);

  return (
    <div className={`canvas-view ${theme}`}>
      <div className="canvas-toolbar">
        <button onClick={onBackToProjects}>← Back to Projects</button>
        {isEditingProjectName ? (
          <input
            ref={projectNameInputRef}
            type="text"
            value={projectNameInput}
            onChange={(e) => setProjectNameInput(e.target.value)}
            onBlur={() => {
              onRenameProject(projectNameInput);
              setIsEditingProjectName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onRenameProject(projectNameInput);
                setIsEditingProjectName(false);
              } else if (e.key === 'Escape') {
                setProjectNameInput(project.name);
                setIsEditingProjectName(false);
              }
            }}
            autoFocus
            style={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              padding: '4px 8px',
              border: '2px solid #00aaff',
              borderRadius: '4px',
              background: theme === 'dark' ? '#2a2a2a' : '#ffffff',
              color: theme === 'dark' ? '#ffffff' : '#000000',
            }}
          />
        ) : (
          <h2
            onClick={() => {
              setIsEditingProjectName(true);
              setTimeout(() => projectNameInputRef.current?.focus(), 0);
            }}
            style={{ cursor: 'pointer', userSelect: 'none' }}
            title="Click to rename"
          >
            {project.name}
          </h2>
        )}
        <div className="tool-buttons">
          <button
            className={tool === 'line' ? 'active' : ''}
            onClick={() => onSetTool('line')}
            title="Line"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="20" x2="20" y2="4" />
            </svg>
          </button>
          <button
            className={tool === 'rectangle' ? 'active' : ''}
            onClick={() => onSetTool('rectangle')}
            title="Rectangle"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="1" />
            </svg>
          </button>
          <button
            className={tool === 'door' ? 'active' : ''}
            onClick={() => onSetTool('door')}
            title="Door"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="20" x2="4" y2="4" />
              <path d="M 4 4 A 16 16 0 0 0 20 20" fill="none" />
              <line x1="4" y1="4" x2="12" y2="12" opacity="0.5" />
              <line x1="4" y1="4" x2="16" y2="8" opacity="0.5" />
            </svg>
          </button>
          <button
            className={tool === 'circle' ? 'active' : ''}
            onClick={() => onSetTool('circle')}
            title="Circle"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" />
            </svg>
          </button>
          <button
            className={tool === 'text' ? 'active' : ''}
            onClick={() => onSetTool('text')}
            title="Text"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="12" y1="4" x2="12" y2="20" />
              <line x1="9" y1="20" x2="15" y2="20" />
            </svg>
          </button>
        </div>
        <div className="export-buttons">
          <button onClick={() => setShowSettings(!showSettings)} title="Settings">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
              <circle cx="8" cy="6" r="2" fill="currentColor" />
              <circle cx="14" cy="12" r="2" fill="currentColor" />
              <circle cx="11" cy="18" r="2" fill="currentColor" />
            </svg>
          </button>
          <button onClick={onExport}>Export JSON</button>
          <button onClick={() => fileInputRef.current?.click()}>Import JSON</button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onImport(e.target.files[0]);
              }
            }}
          />
        </div>
      </div>
      {showSettings && (
        <>
          <div className="modal-overlay" onClick={() => setShowSettings(false)} />
          <div className="modal-content">
            <div className="modal-header">
              <h3>Project Settings</h3>
              <button className="modal-close" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="property-group">
              <label>Theme</label>
              <button
                onClick={onToggleTheme}
                className="theme-toggle-button"
              >
                {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </button>
            </div>
            <div className="property-group">
              <label>Label Font Size</label>
              <input
                type="number"
                min="8"
                max="24"
                value={project.labelFontSize || 12}
                onChange={(e) => onUpdateProjectSettings({ labelFontSize: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </>
      )}
      {editingTextId && (() => {
        const element = project.elements.find(e => e.id === editingTextId);
        if (!element) return null;

        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();

        let screenX: number;
        let screenY: number;
        let fontSize: number;
        let fontFamily: string;
        let value: string;
        let updateField: 'content' | 'text';

        if (element.type === 'text') {
          screenX = element.x * viewTransform.scale + viewTransform.offsetX + rect.left;
          screenY = element.y * viewTransform.scale + viewTransform.offsetY + rect.top;
          fontSize = element.fontSize;
          fontFamily = element.fontFamily;
          value = element.content;
          updateField = 'content';
        } else {
          const bounds = getElementBounds(element);
          screenX = bounds.centerX * viewTransform.scale + viewTransform.offsetX + rect.left;
          screenY = bounds.centerY * viewTransform.scale + viewTransform.offsetY + rect.top;
          fontSize = 14;
          fontFamily = 'Arial';
          value = element.text || '';
          updateField = 'text';
        }

        const textColor = theme === 'dark' ? '#ffffff' : '#000000';
        const backgroundColor = theme === 'dark' ? '#1a1a1a' : '#ffffff';

        return (
          <input
            ref={textInputRef}
            type="text"
            value={value}
            className="text-editor-input"
            style={{
              position: 'fixed',
              left: `${screenX}px`,
              top: `${screenY - fontSize}px`,
              fontSize: `${fontSize}px`,
              fontFamily: fontFamily,
              color: textColor,
              background: backgroundColor,
              border: '2px solid #00aaff',
              outline: 'none',
              padding: '2px',
              zIndex: 1000,
            }}
            onChange={(e) => {
              onUpdateElement(editingTextId, { [updateField]: e.target.value });
            }}
            onBlur={() => setEditingTextId(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                setEditingTextId(null);
              }
            }}
          />
        );
      })()}
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        style={{ cursor }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
};
