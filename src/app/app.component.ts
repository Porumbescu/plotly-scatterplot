import { Component } from '@angular/core';
import { ScatterPlotComponent } from './scatter-plot/scatter-plot.component';

@Component({
  selector: 'app-root',
  template: `
    <h1>Plotly Scatter Plot Example</h1>
    <app-scatter-plot></app-scatter-plot>
  `,
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [ScatterPlotComponent],
})
export class AppComponent {
  title = 'plotly-scatter-plot';
}
