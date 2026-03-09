/*
========================================
VERSION: 1.0
SYSTEM: UI SYSTEM
AUTHOR: jude
DESCRIPTION:
- Tracks UI elements and their states (Power, Torch, etc.)
- Exposes clean render data to the RenderSystem
========================================
*/

export function createUISystem(player) {
  const uiState = {
    power: {
      current: 0,
      max: 100,
      percentage: 1.0,
    },
    torch: {
      isOn: false,
      statusText: "Torch: OFF",
    },
    activeMessage: null,
  };

  return {
    getUIData() {
      return uiState;
    },

    update(deltaTime) {
      if (player.power) {
        uiState.power.current = Math.round(player.power.current);
        uiState.power.max = player.power.maxPower;
        uiState.power.percentage = Math.max(
          0,
          player.power.current / player.power.maxPower,
        );
      }

      if (player.torch) {
        uiState.torch.isOn = player.torch.isOn;
        uiState.torch.statusText = player.torch.isOn
          ? "Torch: ON"
          : "Torch: OFF";
      }
    },

    showMessage(text, durationMs) {
      uiState.activeMessage = text;
    },
  };
}
