import * as alt from 'alt-client';
import * as native from 'natives';
alt.on('connectionComplete', handleConnectionComplete);
async function handleConnectionComplete() {
    native.destroyAllCams(true);
    native.renderScriptCams(false, false, 0, false, false, false);
    native.startAudioScene(`CHARACTER_CHANGE_IN_SKY_SCENE`);
    native.doScreenFadeOut(0);
    native.triggerScreenblurFadeOut(0);
}
alt.on('disconnect', handleDisconnect);
function handleDisconnect() {
    native.stopAudioScenes();
}
