import { registerRenderer } from "./renderer-registry";
import { stickyNoteRenderer } from "./sticky-note-renderer";
import { rectangleRenderer } from "./rectangle-renderer";
import { circleRenderer } from "./circle-renderer";
import { textRenderer } from "./text-renderer";
import { frameRenderer } from "./frame-renderer";
import { lineRenderer } from "./line-renderer";
import { connectorRenderer } from "./connector-renderer";

registerRenderer("sticky_note", stickyNoteRenderer);
registerRenderer("rectangle", rectangleRenderer);
registerRenderer("circle", circleRenderer);
registerRenderer("text", textRenderer);
registerRenderer("frame", frameRenderer);
registerRenderer("line", lineRenderer);
registerRenderer("connector", connectorRenderer);
