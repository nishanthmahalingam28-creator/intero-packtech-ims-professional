// A tiny event channel (no library needed).
//   "mutated"      -> any create/update/delete succeeded  -> lists on screen reload themselves
//   "unauthorized" -> the server said 401                 -> AuthContext signs the user out
export const dataBus = new EventTarget();
