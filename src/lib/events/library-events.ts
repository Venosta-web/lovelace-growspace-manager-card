export class LibraryExportReadyEvent extends CustomEvent<{ url: string }> {
  static readonly TYPE = 'library-export-ready';
  constructor(url: string) {
    super(LibraryExportReadyEvent.TYPE, {
      detail: { url },
      bubbles: true,
      composed: true,
    });
  }
}
