# ADR 0058 — Each dialog is its own lazy chunk

**Status:** Accepted

## Context

`growspace-dialog-host.container.ts` imported all 24 dialogs statically. The
house pattern that [ADR 0056](0056-a-chunk-may-declare-that-nothing-imports-it.md)
describes as "a static import" made the dialog-host chunk 116 modules, 836 KB
minified and 191 KB gzip. Opening any dialog fetched every dialog. Logging a
training session downloaded the irrigation editor, the strain editor, the
vision snapshots, the QR encoder and the Grow Master chat (#969).

The host is the right place for the dialog handlers. Their mutators live in
slices the entry already carries, and one place owns the opening and closing of
every dialog. The problem was only that the router and its destinations were
compiled as one unit.

## Decision

**The host is a router and imports no dialog.** `growspace-dialog-chunks.ts`
maps every dialog type to the `LAZY_CHUNKS` entry that defines it, the element
tag it renders, and a dynamic `import()` of the module. The map is a `Record`
over the dialog union, so a new dialog type fails to compile until it says
where its element comes from.

**A dialog renders once its element is defined, never before.** On an open, the
host fetches the chunk through `loadLazyChunk` and renders nothing until the tag
is defined. Rendering the tag early would produce an unknown element that
upgrades whenever its chunk arrives. When the chunk cannot be loaded, the host
renders a small `gs-dialog` holding `<growspace-lazy-chunk-error>`, which names
the missing file and closes like any other dialog. The click never does
nothing.

**One chunk per dialog, except for two families.** Rollup names a chunk after
the module that is dynamically imported, so a family is a module that exists
only to be that name:

- `label-dialogs`: print, batch print and the Label Templates frame. They share
  the QR encoder and the label layout, so splitting them saves nothing.
- `nutrient-dialogs`: Feed & Water already renders the inventory and preset
  editors inside itself.

Code that two dialogs share is placed by rollup's own chunking. Each shared
chunk is fetched only by the dialogs that import it. One merged "dialog shared"
chunk was rejected: it would send the QR encoder and the camera capture code
with every dialog.

**Every dialog chunk except `label-dialogs` declares `onDemandOnly`**, so the
release validator fails any static edge into one. `label-dialogs` is exempt
because the Label Template view is opened only from those dialogs, and rollup
lets it import their shared code back out of `label-dialogs`. That static edge
can only be followed after `label-dialogs` has loaded. The validator now
resolves a chunk name to its file exactly, as `growspace-<name>-<hash>.js`.
Prefix matching could not tell `tc` from `tc-dialog`.

## Consequences

The dialog host drops from 191 KB to 9 KB gzip. The largest dialog chunk is the
irrigation dialog at 46 KB, so the Stage 2 catch-all budget of 60 KB from #971
applies to every dialog, and none needs a rule of its own.

The first open of each dialog now waits on one request. That request is the
dialog alone, where it used to be all of them, and later opens come from the
module map.

A test that renders a dialog through the host must load that dialog first, as
the host's own suites do in `beforeAll`. Two tests keep the split honest from
opposite sides. One asserts that importing the host defines no dialog element.
The other opens the training, IPM and water dialogs against a real install and
asserts which chunks the browser fetched.
