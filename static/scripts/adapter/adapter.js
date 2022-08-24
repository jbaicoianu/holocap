export class HolocapAdapter extends EventTarget {
  // Adapters can dispatch the following events:
  //
  // - connect
  // - disconnect
  // - session_list
  // - session_snap
  // - session_update
  // - session_joined

  // Adapters must implement the following API: 
  createSession(sessionname) {
  }
  joinSession(sessionid) {
  }
  snap(sessionid, snapid) {
  }
  upload(sessionid, snapid, image) {
  }
}

