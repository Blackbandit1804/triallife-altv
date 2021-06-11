import * as alt from 'alt-server';
import { Account } from '../../interfaces/account';
import { Permissions } from '../../../shared/enums/permission';
import { getUniquePlayerHash } from '../../utility/encryption';
import { Database, getDatabase } from 'simplymongo';
import { DefaultConfig } from '../../configs/settings';
import { distance2d } from '../../../shared/utility/vector';
import { SystemEvent } from '../../../shared/enums/system';
import { TlrpPlayerEvent } from '../../enums/tlrp';
import { ActionMenu } from '../../../shared/interfaces/actions';
import { playerFuncs } from '../player';
import { Collections } from '../../interfaces/collections';
import emit from './emit';
import save from './save';
import dataUpdater from './updater';
import safe from './safe';
import sync from './sync';

const db: Database = getDatabase();

async function account(p: alt.Player, accountData: Partial<Account>): Promise<void> {
    if (!accountData.permissionLevel) {
        accountData.permissionLevel = Permissions.NONE;
        db.updatePartialData(accountData._id, { permissionLevel: Permissions.NONE }, Collections.Accounts);
    }
    if (!accountData.quickToken || Date.now() > accountData.quickTokenExpiration || p.needsQT) {
        const qt: string = getUniquePlayerHash(p, p.discord.id);
        db.updatePartialData(
            accountData._id,
            {
                quickToken: qt,
                quickTokenExpiration: Date.now() + 60000 * 60 * 48 // 48 Hours
            },
            Collections.Accounts
        );
        alt.emitClient(p, SystemEvent.QUICK_TOKEN_UPDATE, p.discord.id);
    }
    emit.meta(p, 'permissionLevel', accountData.permissionLevel);
    p.accountData = accountData;
}

function actionMenu(player: alt.Player, actionMenu: ActionMenu) {
    alt.emitClient(player, SystemEvent.SET_ACTION_MENU, actionMenu);
}

function unconscious(p: alt.Player, killer: alt.Player = null, weaponHash: any = null): void {
    p.spawn(p.pos.x, p.pos.y, p.pos.z, 0);
    if (!p.data.isUnconscious) {
        p.data.isUnconscious = true;
        emit.meta(p, 'isUnconscious', true);
        save.field(p, 'isUnconscious', true);
        alt.log(`(${p.id}) ${p.data.name} has got unconscious.`);
    }
    if (!p.nextDeathSpawn) {
        p.nextDeathSpawn = Date.now() + DefaultConfig.RESPAWN_TIME;
    }
    alt.emit(TlrpPlayerEvent.UNCONSCIOUS, p);
}

async function firstConnect(p: alt.Player): Promise<void> {
    if (!p || !p.valid) {
        return;
    }

    if (process.env.TLRP_READY === 'false') {
        p.kick('Still warming up...');
        return;
    }

    const pos = { ...DefaultConfig.CHARACTER_SELECT_POS };

    p.dimension = p.id + 1; // First ID is 0. We add 1 so everyone gets a unique dimension.
    p.pendingLogin = true;

    dataUpdater.init(p, null);
    safe.setPosition(p, pos.x, pos.y, pos.z);
    sync.time(p);
    sync.weather(p);

    alt.setTimeout(() => {
        if (!p || !p.valid) {
            return;
        }

        alt.emitClient(p, SystemEvent.QUICK_TOKEN_FETCH);
    }, 500);
}

function frozen(p: alt.Player, value: boolean): void {
    alt.emitClient(p, SystemEvent.PLAYER_SET_FREEZE, value);
}

function respawned(p: alt.Player, position: alt.Vector3 = null): void {
    p.nextDeathSpawn = null;
    p.data.isUnconscious = false;
    emit.meta(p, 'isUnconscious', false);
    save.field(p, 'isUnconscious', false);

    let nearestHopsital = position;
    if (!position) {
        const hospitals = [...DefaultConfig.VALID_HOSPITALS];
        let index = 0;
        let lastDistance = distance2d(p.pos, hospitals[0]);
        for (let i = 1; i < hospitals.length; i++) {
            const distanceCalc = distance2d(p.pos, hospitals[i]);
            if (distanceCalc > lastDistance) {
                continue;
            }
            lastDistance = distanceCalc;
            index = i;
        }
        nearestHopsital = hospitals[index] as alt.Vector3;
        if (DefaultConfig.RESPAWN_LOSE_WEAPONS) {
            playerFuncs.inventory.removeAllWeapons(p);
        }
    }

    safe.setPosition(p, nearestHopsital.x, nearestHopsital.y, nearestHopsital.z);
    p.spawn(nearestHopsital.x, nearestHopsital.y, nearestHopsital.z, 0);

    alt.nextTick(() => {
        p.clearBloodDamage();
        safe.addBlood(p, DefaultConfig.RESPAWN_HEALTH, true);
        safe.addArmour(p, DefaultConfig.RESPAWN_ARMOUR, true);
    });

    alt.emit(TlrpPlayerEvent.SPAWNED, p);
}

export default {
    account,
    actionMenu,
    unconscious,
    firstConnect,
    frozen,
    respawned
};