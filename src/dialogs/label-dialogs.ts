/**
 * The label printing dialogs, loaded as one chunk.
 *
 * They are one feature and share its heaviest code — the QR encoder and the
 * label layout in `print-label-logic` — so splitting them further would buy a
 * request and save nothing. This file exists to give the chunk its name; the
 * dialog host reaches it through `LAZY_CHUNKS.labelDialogs`, and nothing else
 * may import it statically, or the QR encoder rides along with every dialog.
 */
import './print-label-dialog';
import './batch-print-label-dialog';
import './label-templates-dialog';
