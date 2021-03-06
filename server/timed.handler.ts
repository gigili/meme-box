import {Dictionary} from "../projects/contracts/src/lib/types";
import {PersistenceInstance} from "./persistence";
import {triggerMediaClipById} from "./websocket-server";
import Timeout = NodeJS.Timeout;

export class TimedHandler {
  private intervalDictionary: Dictionary<Timeout> = {};

  startTimers () {
    var timedClips = PersistenceInstance.listTimedEvents();

    for (const timer of timedClips) {
      if (timer.active) {
        this.intervalDictionary[timer.id] = setInterval(() => {
          triggerMediaClipById({
            id: timer.clipId
          });
        }, timer.everyXms);
      }
    }

  }

  refreshTimers () {
    // easiest way
    this.stopTimers();
    this.startTimers();

    // todo more fine-tuned approach, only reset the changed timers
  }

  stopTimers () {
    const allTimeouts = Object.values(this.intervalDictionary);

    for (const timeout of allTimeouts) {
      clearInterval(timeout);
    }
  }
}
