const fs = require('fs');
const file = 'tests/unit/dialogs/irrigation-dialog-extra.spec.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
`        it('should handle undo deletion failure', async () => {
            mocks.addIrrigationTime.mockRejectedValue(new Error('Test error'));
            (element as any)._showUndoToast('irrigation', '08:30', 60);
            await element.updateComplete;

            await (element as any)._undoDelete();
            
            const toast = element.shadowRoot?.querySelector('.toast-notification.error');
            expect(toast).toBeTruthy();
        });`,
`        it('should handle undo deletion failure', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            mocks.addIrrigationTime.mockRejectedValue(new Error('Test error'));
            (element as any)._showUndoToast('irrigation', '08:30', 60);
            await element.updateComplete;

            await (element as any)._undoDelete();
            
            expect(consoleSpy).toHaveBeenCalled();
            expect((element as any)._pendingUndo).toBeUndefined();
            consoleSpy.mockRestore();
        });`
);
fs.writeFileSync(file, content);
