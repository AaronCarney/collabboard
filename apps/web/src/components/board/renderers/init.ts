import { registerRenderer } from "./renderer-registry";
import { stickyNoteRenderer } from "./sticky-note-renderer";
import { rectangleRenderer } from "./rectangle-renderer";
import { circleRenderer } from "./circle-renderer";
import { textRenderer } from "./text-renderer";

registerRenderer("sticky_note", stickyNoteRenderer);
registerRenderer("rectangle", rectangleRenderer);
registerRenderer("circle", circleRenderer);
registerRenderer("text", textRenderer);
