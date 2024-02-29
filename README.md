# Example App

An example application demonstrating an issue when packaging plotly.js on M1 Macs.

To reproduce, run `npm install` and then `npm start`. Your browser should open to http://localhost:4000, and you will only be able to see the scatter points, you cannot see the lines.

The error shown in the browser console is:
```
WebGL: INVALID_OPERATION: drawArraysInstancedANGLE: no valid shader program in use
draw @ VM3230:344
REGLCommand @ plotly__js_lib_scattergl__js.js?v=53ac7925:16531
(anonymous) @ plotly__js_lib_scattergl__js.js?v=53ac7925:7087
Line2D.draw @ plotly__js_lib_scattergl__js.js?v=53ac7925:7071
draw @ plotly__js_lib_scattergl__js.js?v=53ac7925:3089
exports.redrawReglTraces @ chunk-67XDH4U7.js?v=b62b0047:5809
exports.drawData @ chunk-67XDH4U7.js?v=b62b0047:5775
lib.syncOrAsync @ chunk-HPNYZSAD.js?v=b62b0047:17252
_doPlot @ plotly__js_lib_core__js.js?v=5148c0b4:1521
newPlot @ plotly__js_lib_core__js.js?v=5148c0b4:1648
(anonymous) @ index.tsx:30
Show 9 more frames
Show less
WebGL: INVALID_OPERATION: useProgram: program not valid
```