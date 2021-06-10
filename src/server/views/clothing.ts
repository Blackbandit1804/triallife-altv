import * as alt from 'alt-server';
import { ViewEventsClothing, ItemTypes } from '../../shared/utility/enums';
import * as sm from 'simplymongo';
import { playerFuncs } from '../extensions/player';
import { ClothingComponent } from '../../shared/interfaces/clothing';
import { Item } from '../../shared/interfaces/item';
import { deepCloneObject } from '../../shared/utility/usefull';
import { LocaleController } from '../../shared/locale/locale';
import { LOCALE_KEYS } from '../../shared/locale/languages/keys';

const db: sm.Database = sm.getDatabase();

alt.onClient(ViewEventsClothing.Exit, handleExit);
alt.onClient(ViewEventsClothing.Purchase, handlePurchase);

const icons = ['hat', 'mask', 'shirt', 'bottoms', 'shoes', 'glasses', 'ear', 'backpack', 'armour', 'watch', 'bracelet'];

const wearableRef: Item = {
    name: `Item`,
    description: `An Item`,
    icon: 'crate',
    slot: 0,
    quantity: 1,
    behavior: ItemTypes.CAN_DROP | ItemTypes.CAN_TRADE | ItemTypes.IS_EQUIPMENT,
    data: {}
};

function handleExit(player: alt.Player) {
    playerFuncs.sync.inventory(player);
}

function handlePurchase(player: alt.Player, equipmentSlot: number, component: ClothingComponent, name: string, desc: string) {
    const newItem = deepCloneObject<Item>(wearableRef);
    newItem.name = name;
    newItem.description = desc;
    newItem.data = { ...component };
    newItem.data.sex = player.data.design.sex;
    newItem.slot = equipmentSlot;
    newItem.icon = icons[equipmentSlot];
    newItem.quantity = 1;
    newItem.equipment = equipmentSlot;
    let didGetAdded = false;
    if (playerFuncs.inventory.isEquipmentSlotFree(player, equipmentSlot)) {
        didGetAdded = playerFuncs.inventory.equipmentAdd(player, newItem, equipmentSlot);
    } else {
        const openSlot = playerFuncs.inventory.getFreeInventorySlot(player);
        if (!openSlot) {
            playerFuncs.emit.sound2D(player, 'item_error');
            return;
        }
        playerFuncs.emit.notification(player, LocaleController.get(LOCALE_KEYS.CLOTHING_ITEM_IN_INVENTORY));
        didGetAdded = playerFuncs.inventory.inventoryAdd(player, newItem, openSlot.slot, openSlot.tab);
    }
    if (!didGetAdded) {
        playerFuncs.emit.sound2D(player, 'item_error');
        return;
    }
    playerFuncs.save.field(player, 'inventory', player.data.inventory);
    playerFuncs.save.field(player, 'equipment', player.data.equipment);
    playerFuncs.sync.inventory(player);
    playerFuncs.emit.sound2D(player, 'item_purchase');
}
