import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { throttle } from 'lodash';

declare var Plotly: any;

interface PlotHTMLElement extends HTMLElement {
  on(event: string, callback: (data: any) => void): void;
  data: any[];
  layout: any;
  _fullLayout: any;
}

@Component({
  selector: 'app-scatter-plot',
  templateUrl: './scatter-plot.component.html',
  styleUrls: ['./scatter-plot.component.css'],
  standalone: true,
})
export class ScatterPlotComponent implements OnInit {
  @ViewChild('plotContainer', { static: true })
  plotContainer!: ElementRef<PlotHTMLElement>;

  private draggingPointIndex: number | null = null;
  private xaxis: any;
  private yaxis: any;

  private draggingPoints: { x: number; y: number }[] = [];

  private xArc = 4;
  private yArc = 4;

  constructor() {}

  ngOnInit() {
    this.renderPlot();
  }

  renderPlot() {
    const dataPoints = [
      // First pair
      { x: 2, y: 8 },
      { x: 2.5, y: 5 },
      // Second pair
      { x: 6, y: 2 },
      { x: 8, y: 7 },
      // Points on axes for the arc lines
      { x: 0, y: this.yArc }, // y-axis
      { x: this.xArc, y: 0 }, // x-axis
    ];

    const linesTrace = {
      x: [],
      y: [],
      mode: 'lines',
      type: 'scatter',
      line: { color: 'black', width: 2 },
      name: 'Lines',
    };

    const lineMarkersTrace = {
      x: [],
      y: [],
      mode: 'markers',
      type: 'scatter',
      marker: {
        size: 15,
        color: 'rgba(0,0,0,0)',
      },
      name: 'Line Markers',
      hoverinfo: 'none',
    };

    const draggablePointsTrace = {
      x: [],
      y: [],
      mode: 'markers',
      type: 'scatter',
      marker: { size: 20, color: 'rgba(0,0,0,0)' },
      name: 'Draggable Points',
      hoverinfo: 'none',
    };

    const arcMarkersTrace = {
      x: [],
      y: [],
      mode: 'markers',
      type: 'scatter',
      marker: {
        size: 15,
        color: 'rgba(0,0,0,0)',
      },
      name: 'Arc Markers',
      hoverinfo: 'none',
    };

    const data = [linesTrace, draggablePointsTrace, lineMarkersTrace, arcMarkersTrace];

    this.draggingPoints = dataPoints;

    const layout = {
      title: 'Draggable Lines and Arc in Positive Quadrant',
      dragmode: 'pan',
      xaxis: {
        range: [0, 10],
        fixedrange: false,
        rangemode: 'nonnegative',
        constrain: 'domain',
      },
      yaxis: {
        range: [0, 10],
        fixedrange: false,
        rangemode: 'nonnegative',
        constrain: 'domain',
      },
      shapes: [
        {
          type: 'rect',
          x0: 0,
          y0: 0,
          x1: 10,
          y1: 10,
          line: {
            color: 'black',
            width: 2,
          },
          fillcolor: 'rgba(0,0,0,0)',
          layer: 'below',
        },
        {
          type: 'path',
          path: '',
          line: {
            color: 'black',
            width: 2,
          },
          fillcolor: 'rgba(128, 128, 128, 0.5)',
          layer: 'below',
        },
        {
          type: 'path',
          path: '',
          fillcolor: 'rgba(128, 128, 128, 0.5)',
          line: { width: 0 },
          layer: 'below',
        },
        {
          type: 'path',
          path: '',
          fillcolor: 'rgba(128, 128, 128, 0.5)',
          line: { width: 0 },
          layer: 'below',
        },
      ],
    };

    const config = {
      responsive: true,
      staticPlot: false,
    };

    Plotly.newPlot(
      this.plotContainer.nativeElement,
      data,
      layout,
      config
    ).then(() => {
      const plotElement = this.plotContainer.nativeElement;
      const fullLayout = plotElement._fullLayout;
      this.xaxis = fullLayout.xaxis;
      this.yaxis = fullLayout.yaxis;


      this.updateLinesToPlotBorders();
      this.updateArc();
      this.updateHighlightedAreas();

      Plotly.redraw(plotElement);

      plotElement.on('plotly_relayout', (eventData: any) => {
        const xRange = eventData['xaxis.range[0]'] !== undefined ? [eventData['xaxis.range[0]'], eventData['xaxis.range[1]']] : null;
        const yRange = eventData['yaxis.range[0]'] !== undefined ? [eventData['yaxis.range[0]'], eventData['yaxis.range[1]']] : null;

        const update: any = {};

        if (xRange) {
          if (xRange[0] < 0) {
            const shift = -xRange[0];
            update['xaxis.range[0]'] = 0;
            update['xaxis.range[1]'] = xRange[1] + shift;
          }
        }

        if (yRange) {
          if (yRange[0] < 0) {
            const shift = -yRange[0];
            update['yaxis.range[0]'] = 0;
            update['yaxis.range[1]'] = yRange[1] + shift;
          }
        }

        if (Object.keys(update).length > 0) {
          Plotly.relayout(plotElement, update).then(() => {
            this.updateLinesToPlotBorders();
            this.updateArc();
            this.updateHighlightedAreas();
            Plotly.redraw(plotElement);
          });
        } else {
          this.updateLinesToPlotBorders();
          this.updateArc();
          this.updateHighlightedAreas();
          Plotly.redraw(plotElement);
        }
      });

      plotElement.on('plotly_click', (eventData: any) => {
        const curveNumber = eventData.points[0].curveNumber;
        if (curveNumber === 1 || curveNumber === 2) {
          const pointIndex = eventData.points[0].pointIndex;
          const lineIndex = curveNumber === 1 ? pointIndex : Math.floor(pointIndex / 20);
          this.startDragging(lineIndex);
        } else if (curveNumber === 3) {
          this.startDraggingArc();
        }
      });
    });
  }

  startDragging(pointIndex: number) {
    this.draggingPointIndex = pointIndex;
    const fullLayout = this.plotContainer.nativeElement._fullLayout;
    this.xaxis = fullLayout.xaxis;
    this.yaxis = fullLayout.yaxis;

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  onMouseMove = throttle((event: MouseEvent) => {
    if (this.draggingPointIndex === null) return;

    const rect = this.plotContainer.nativeElement.getBoundingClientRect();
    const xPos = event.clientX - rect.left;
    const yPos = event.clientY - rect.top;

    const xData = this.xaxis.p2l(xPos);
    const yData = this.yaxis.p2l(yPos);

    const x = Math.max(0.0001, xData);
    const y = Math.max(0.0001, yData);

    this.draggingPoints[this.draggingPointIndex] = { x, y };

    this.updateLinesToPlotBorders();
    this.updateHighlightedAreas();

    Plotly.redraw(this.plotContainer.nativeElement);
  }, 16);

  onMouseUp = () => {
    this.draggingPointIndex = null;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  startDraggingArc() {
    document.addEventListener('mousemove', this.onArcMouseMove);
    document.addEventListener('mouseup', this.onArcMouseUp);
  }

  onArcMouseMove = throttle((event: MouseEvent) => {
    const rect = this.plotContainer.nativeElement.getBoundingClientRect();
    const xPos = event.clientX - rect.left;
    const yPos = event.clientY - rect.top;

    const xData = this.xaxis.p2l(xPos);
    const yData = this.yaxis.p2l(yPos);

    this.xArc = Math.max(0, xData);
    this.yArc = Math.max(0, yData);

    this.draggingPoints[4] = { x: 0, y: this.yArc };
    this.draggingPoints[5] = { x: this.xArc, y: 0 };

    this.updateArc();
    this.updateLinesToPlotBorders();

    Plotly.redraw(this.plotContainer.nativeElement);
  }, 16);

  onArcMouseUp = () => {
    document.removeEventListener('mousemove', this.onArcMouseMove);
    document.removeEventListener('mouseup', this.onArcMouseUp);
  };

  private calculateLineEndPoint(x: number, y: number): { x: number; y: number } {
    const xRange = this.xaxis.range;
    const yRange = this.yaxis.range;

    const slope = y / x;

    const xMax = xRange[1];
    const yMax = yRange[1];

    const yAtXMax = slope * xMax;
    const xAtYMax = yMax / slope;

    if (yAtXMax <= yMax) {
      return { x: xMax, y: yAtXMax };
    } else {
      return { x: xAtYMax, y: yMax };
    }
  }

  private updateLinesToPlotBorders() {
    const linesTrace = this.plotContainer.nativeElement.data[0];
    const draggablePointsTrace = this.plotContainer.nativeElement.data[1];
    const lineMarkersTrace = this.plotContainer.nativeElement.data[2];

    linesTrace.x = [];
    linesTrace.y = [];
    draggablePointsTrace.x = [];
    draggablePointsTrace.y = [];
    lineMarkersTrace.x = [];
    lineMarkersTrace.y = [];

    for (let i = 0; i < this.draggingPoints.length; i++) {
      const { x, y } = this.draggingPoints[i];

      let lineEnd;
      if (i >= 4) {
        lineEnd = { x, y };
      } else {
        lineEnd = this.calculateLineEndPoint(x, y);
      }

      linesTrace.x.push(0, lineEnd.x, null);
      linesTrace.y.push(0, lineEnd.y, null);

      draggablePointsTrace.x.push(lineEnd.x);
      draggablePointsTrace.y.push(lineEnd.y);

      const numMarkers = 20;
      for (let j = 1; j <= numMarkers; j++) {
        const t = j / (numMarkers + 1);
        const markerX = t * lineEnd.x;
        const markerY = t * lineEnd.y;
        lineMarkersTrace.x.push(markerX);
        lineMarkersTrace.y.push(markerY);
      }
    }
  }

  private generateArcPath(): string {
    const numPoints = 50;
    const angles = [];
    const startAngle = Math.atan2(this.yArc, 0);
    const endAngle = Math.atan2(0, this.xArc);

    const angleStep = (startAngle - endAngle) / numPoints;

    for (let i = 0; i <= numPoints; i++) {
      const angle = startAngle - i * angleStep;
      angles.push(angle);
    }

    const xs = angles.map((angle) => this.xArc * Math.cos(angle));
    const ys = angles.map((angle) => this.yArc * Math.sin(angle));

    let path = `M 0,0`;
    for (let i = 0; i < xs.length; i++) {
      path += ` L ${xs[i]},${ys[i]}`;
    }
    path += ` Z`;

    return path;
  }

  private updateArc() {
    const arcShape = this.plotContainer.nativeElement.layout.shapes[1];
    arcShape.path = this.generateArcPath();

    const arcMarkersTrace = this.plotContainer.nativeElement.data[3];
    arcMarkersTrace.x = [];
    arcMarkersTrace.y = [];

    const numMarkers = 20;
    const startAngle = Math.atan2(this.yArc, 0);
    const endAngle = Math.atan2(0, this.xArc);
    const angleStep = (startAngle - endAngle) / (numMarkers + 1);

    for (let i = 1; i <= numMarkers; i++) {
      const angle = startAngle - i * angleStep;
      const x = this.xArc * Math.cos(angle);
      const y = this.yArc * Math.sin(angle);
      arcMarkersTrace.x.push(x);
      arcMarkersTrace.y.push(y);
    }
  }

  private updateHighlightedAreas() {
    const areaShape1 = this.plotContainer.nativeElement.layout.shapes[2];
    const areaShape2 = this.plotContainer.nativeElement.layout.shapes[3];

    const line0End = this.calculateLineEndPoint(
      this.draggingPoints[0].x,
      this.draggingPoints[0].y
    );
    const line1End = this.calculateLineEndPoint(
      this.draggingPoints[1].x,
      this.draggingPoints[1].y
    );

    let path1 = `M 0,0 L ${line0End.x},${line0End.y} L ${line1End.x},${line1End.y} Z`;
    areaShape1.path = path1;

    const line2End = this.calculateLineEndPoint(
      this.draggingPoints[2].x,
      this.draggingPoints[2].y
    );
    const line3End = this.calculateLineEndPoint(
      this.draggingPoints[3].x,
      this.draggingPoints[3].y
    );

    let path2 = `M 0,0 L ${line2End.x},${line2End.y} L ${line3End.x},${line3End.y} Z`;
    areaShape2.path = path2;
  }
}
