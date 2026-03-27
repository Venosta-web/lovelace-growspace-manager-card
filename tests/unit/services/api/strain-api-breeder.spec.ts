import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrainAPI } from '../../../../src/services/api/strain-api';
import { HomeAssistant } from 'custom-card-helpers';

describe('StrainAPI - Breeder Operations Regression', () => {
    let api: StrainAPI;
    let mockHass: HomeAssistant;
    let sendMessageMock: any;

    beforeEach(() => {
        sendMessageMock = vi.fn().mockResolvedValue({});
        mockHass = {
            connection: {
                sendMessagePromise: sendMessageMock,
            },
        } as any;
        api = new StrainAPI(mockHass);
    });

    it('should send correct payload for updateBreeder', async () => {
        await api.updateBreeder('OldName', 'NewName', 'logo.png');

        expect(sendMessageMock).toHaveBeenCalledWith(expect.objectContaining({
            type: 'growspace_manager/update_breeder',
            original_name: 'OldName',
            new_name: 'NewName',
            logo: 'logo.png'
        }));
    });

    it('should send correct payload for deleteBreeder', async () => {
        await api.deleteBreeder('BreederToDelete');

        expect(sendMessageMock).toHaveBeenCalledWith(expect.objectContaining({
            type: 'growspace_manager/delete_breeder',
            breeder_name: 'BreederToDelete'
        }));
    });
});
