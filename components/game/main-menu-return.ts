let mainMenuReturnRequestId = 0;

export function requestMainMenuReturn() {
  mainMenuReturnRequestId += 1;
  return mainMenuReturnRequestId;
}

export function getMainMenuReturnRequestId() {
  return mainMenuReturnRequestId;
}
