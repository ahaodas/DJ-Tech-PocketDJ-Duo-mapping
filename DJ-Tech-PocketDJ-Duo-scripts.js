const PocketDJ = {};

const ch1 = '[Channel1]'
const ch2 = '[Channel2]'

function connectButtonLed(group, name, btn) {
    return engine.makeConnection(group, name,
        function (value) {
            midi.sendShortMsg(0x90, btn, value * 127 );
        }
    );
}

const jogMods = {
    PITCH: 'pitch',
    SCRATCH: 'scratch'
}

PocketDJ.shiftBtnPressed = {
    1: false,
    2: false
}

PocketDJ.loopSize = {
    1: 4,
    2: 4
}

const topBtnStatus = {
    LOOP: 'LOOP',
    CUE: 'CUE',
    SAMPLE: 'SAMPLE'
}


const deckTopLeds = {
    1: [0x31, 0x32, 0x33],
    2: [0x35, 0x36, 0x37],
}

const topBtnModeLedCodes = {
    1: {
        SAMPLE: deckTopLeds[1][0],
        LOOP: deckTopLeds[1][1],
        CUE: deckTopLeds[1][2]
    },
    2: {
        SAMPLE: deckTopLeds[2][0],
        LOOP: deckTopLeds[2][1],
        CUE: deckTopLeds[2][2]
    }
}

PocketDJ.topBtnStatus = {
    1: topBtnStatus.LOOP,
    2: topBtnStatus.LOOP
}

function switchBtnMode(mode) {
    return function(channel, control, value, status, group) {
        const deck = script.deckFromGroup(group)
            PocketDJ.topBtnStatus[deck] = mode
            deckTopLeds[deck].forEach(function(code) {
                const msg = code === topBtnModeLedCodes[deck][mode] ? LedState.on : LedState.off
                midi.sendShortMsg(0x90, code, msg)
            })
    }
}

const quadLoop = 0x04

PocketDJ.setTopBtnToCue = switchBtnMode(topBtnStatus.CUE)
PocketDJ.setTopBtnToLoop = switchBtnMode(topBtnStatus.LOOP)
PocketDJ.setTopBtnToSample = switchBtnMode(topBtnStatus.SAMPLE)

PocketDJ.handleTopButton_1 = topButtonHandler(16)
PocketDJ.handleTopButton_2 = topButtonHandler(8)
PocketDJ.handleTopButton_3 = topButtonHandler(4)

PocketDJ.deck_1_beatloop_4_enabled = connectButtonLed(ch1, 'beatloop_4_enabled', 0x04)
PocketDJ.deck_1_beatloop_8_enabled = connectButtonLed(ch1, 'beatloop_8_enabled', 0x03)
PocketDJ.deck_1_beatloop_16_enabled = connectButtonLed(ch1, 'beatloop_16_enabled', 0x02)

PocketDJ.deck_2_beatloop_4_enabled = connectButtonLed(ch2, 'beatloop_4_enabled', 0x19)
PocketDJ.deck_2_beatloop_8_enabled = connectButtonLed(ch2, 'beatloop_8_enabled', 0x18)
PocketDJ.deck_2_beatloop_16_enabled = connectButtonLed(ch2, 'beatloop_16_enabled', 0x17)

function topButtonHandler(size) {
    return function(channel, control, value, status, group) {
        const deck = script.deckFromGroup(group)
        switch(PocketDJ.topBtnStatus[deck]){
            case topBtnStatus.LOOP:
                const current = engine.getValue(group, control)
                if(value === 0x7F) {
                    engine.setValue(group, 'beatloop_' + size + '_toggle', current === 1 ? 0 : 1)
                }
                break;
            case topBtnStatus.SAMPLE:
                break;
            case topBtnStatus.CUE:
                break;
            default:
                break

        }

    }
}


PocketDJ.jogTouch = function (channel, control, value, status, group) {
    var deck = script.deckFromGroup(group)
    if( PocketDJ.JogsMods[deck].mode !== jogMods.SCRATCH){
        return
    }
    if ((status & 0xF0) === 0x90 && value === 0x7F) {    // If button down
        var alpha = 1.0/8;
        var beta = alpha/32;
        engine.scratchEnable(deck, 128, 33+1/3, alpha, beta);
    } else {    // If button up
        engine.scratchDisable(deck);
    }
}

PocketDJ.pressShiftBtn = function(channel, control, value, status, group){
    if(status === 176){
        return
    }
    const deck = script.deckFromGroup(group)
    PocketDJ.shiftBtnPressed[deck] = value === ButtonState.pressed
}

// PocketDJ.highEqPressed =  {
//     1: false,
//     2: false,
// }
// PocketDJ.midEqPressed =  {
//     1: false,
//     2: false,
// }
//
// PocketDJ.lowEqPressed =  {
//     1: false,
//     2: false,
// }

// PocketDJ.pressHighEq = function(channel, control, value, status, group){
//     if(status === 176){
//         return
//     }
//     const deck = script.deckFromGroup(group)
//     PocketDJ.highEqPressed[deck] = value === ButtonState.pressed
// }
// PocketDJ.midHighEq = function(channel, control, value, status, group){
//     if(status === 176){
//         return
//     }
//     const deck = script.deckFromGroup(group)
//     PocketDJ.highEqPressed[deck] = value === ButtonState.pressed
// }
// PocketDJ.presslEq = function(channel, control, value, status, group){
//     if(status === 176){
//         return
//     }
//     const deck = script.deckFromGroup(group)
//     PocketDJ.highEqPressed[deck] = value === ButtonState.pressed
// }




PocketDJ.JogsMods = {
    1: { mode: jogMods.SCRATCH, scratchIsEnabled: false, LED: 0x06 },
    2: { mode: jogMods.SCRATCH, scratchIsEnabled: false, LED: 0x1E }
}

PocketDJ.setJogMode = function(channel, control, value, status, group) {
    const deck = script.deckFromGroup(group)
    const jog = PocketDJ.JogsMods[deck]
    if(value === ButtonState.pressed){
        return
    }
    switch (jog.mode) {
        case jogMods.SCRATCH:
            jog.mode = jogMods.PITCH;
            midi.sendShortMsg(0x90, jog.LED, LedState.on);
            break;
        case jogMods.PITCH:
            jog.mode = jogMods.SCRATCH;
            midi.sendShortMsg(0x90, jog.LED, LedState.off);
            break;
    }
}

const shift2 = 0x1A
const shift1 = 0x54

PocketDJ.JogMove =  function(channel, control, value, status, group) {
    const deck = script.deckFromGroup(group);
    // var current = PocketDJ.topBtnStatus[deck];
    // print('MODE ' + current);
    // print('-----------------------------------------------------------------')

    if(status !== 176){
        return
    }
    const delta = value === 63 ? 0.01 : -0.01
    const jog = PocketDJ.JogsMods[deck]
    if(PocketDJ.shiftBtnPressed[deck]) {
        var playposition = engine.getValue(group, 'playposition')
        engine.setValue(group, 'playposition', playposition + delta);
    } else {
        switch(jog.mode){
            case jogMods.SCRATCH:
                engine.scratchTick(deck, value  - 64);
            break;
            case jogMods.PITCH:
                var pitch = engine.getValue(group, 'rate')
                engine.setValue(group, 'rate', pitch + delta);
                break;
        }
    }
}

const LEDS = {
    play1: 0x0d,
    play2: 0x22,
    sync_enabled1: 0x0b,
    sync_enabled2: 0x20,
    cue_default1: 0x0c,
    cue_default2: 0x21,
    cue_set1: 0x0F,
    cue_set2: 0x14,
    pfl1: 0x10,
    pfl2: 0x15,
}

PocketDJ.Deck1PlayLed = connectButtonLed(ch1, 'play', LEDS.play1)
PocketDJ.Deck2PlayLed = connectButtonLed(ch2, 'play', 0x22)
PocketDJ.Deck1SyncLed = connectButtonLed(ch1, 'sync_enabled', 0x0b)
PocketDJ.Deck2SyncLed = connectButtonLed(ch2, 'sync_enabled', 0x20)
PocketDJ.Deck1CueLed = connectButtonLed(ch1, 'cue_default', 0x0c)
PocketDJ.Deck2CueLed = connectButtonLed(ch2, 'cue_default', 0x21)
PocketDJ.Deck1CuePointLed = connectButtonLed(ch1, 'cue_set', 0x0F)
PocketDJ.Deck2CuePointLed = connectButtonLed(ch2, 'cue_set', 0x14)
PocketDJ.Deck1Phones = connectButtonLed(ch1, 'pfl', 0x10)
PocketDJ.Deck2Phones = connectButtonLed(ch2, 'pfl', 0x15)


const leds = [
     0x0d,
     0x22,
     0x0b,
     0x20,
     0x0c,
     0x21,
     0x0F,
     0x14,
     0x10,
     0x15,
     0x04,
     0x03,
     0x02,
]

PocketDJ.init = function (id, debugging) {
    //[1,2,3,4,5,6,11,12,13,15,16,18,20,21,23,24,25,30,32,33,34]

    // for(var i = 10000; i >= 1; i++){
    //     midi.sendShortMsg(0x90, i, LedState.on);
    // }


    deckTopLeds[1].forEach(function(led){
        midi.sendShortMsg(0x90, led, LedState.off);
    })
    midi.sendShortMsg(0x90, topBtnModeLedCodes[1][PocketDJ.topBtnStatus[1]], LedState.on);
    deckTopLeds[2].forEach(function(led){
        midi.sendShortMsg(0x90, led, LedState.off);
    })
    midi.sendShortMsg(0x90, topBtnModeLedCodes[2][PocketDJ.topBtnStatus[2]], LedState.on);

    leds.forEach(function(led){
        if(deckTopLeds[1].indexOf(led) === -1 && deckTopLeds[1].indexOf(led) === -1){
            midi.sendShortMsg(0x90, led, LedState.on);
            engine.beginTimer(500, function() {
                midi.sendShortMsg(0x90, led, LedState.off);
            }, true)
        }
    })
}

PocketDJ.shutdown = function() {
}
