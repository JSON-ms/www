import {formatDate} from "@/utils";
import {Services} from "@/services";
import {useGlobalStore} from "@/stores/global";

interface IError {
  key: string,
  message?: string,
  source?: string,
  stack?: string,
  line?: number,
  column?: number,
  occurred_on: string,
  last_timestamp: number,
  version: string,
  route: string,
  count: number,
  user_agent: string,
  sent: boolean,
  tries: number,
}

let errorQueue: IError[] = [];

// @ts-expect-error it's all fine...
window.onerror = function(message: string , source?: string, line?: number, column?: number, error?: Error) {
  if (error instanceof Error) {
    const splitSource = (source || '').split('?')
    const key = (message + ':' + splitSource[0] + ':' + line + ':' + column).trim().substring(0, 255).replace(/ /g, '-').toLowerCase();
    const currentDate = new Date();
    const currentFormattedDate = formatDate(currentDate, 'YYYY-MM-DD');
    const version = process.env.VUE_APP_PACKAGE_VERSION;
    const existingError = errorQueue.find(error => error.occurred_on === currentFormattedDate && error.key === key && error.version === version);
    if (!existingError) {
      errorQueue.push({
        key,
        message,
        source,
        line,
        column,
        stack: error.stack,
        occurred_on: currentFormattedDate,
        last_timestamp: currentDate.getTime(),
        version: version ?? 'unknown',
        count: 1,
        route: window.location.href,
        user_agent: window.navigator.userAgent,
        sent: false,
        tries: 0,
      });
      saveErrorQueue();
    } else {
      existingError.count++;
      existingError.last_timestamp = currentDate.getTime();
      // not saving in case infinite loop
    }
    syncErrorQueue();
  }
}

function saveErrorQueue() {
  localStorage.setItem('jsonms/error:queue', JSON.stringify(errorQueue));
}

function loadErrorQueue() {
  errorQueue = []
  errorQueue.push(...JSON.parse(localStorage.getItem('jsonms/error:queue') ?? '[]'));
}

let syncErrorInterval: any;
function syncErrorQueue() {
  clearInterval(syncErrorInterval);
  syncErrorInterval = setInterval(() => {
    sendErrorQueue();
  }, 15 * 1000);
}

function sendErrorQueue() {
  const globalStore = useGlobalStore();
  if (globalStore.session.loggedIn) {
    const currentDate = formatDate(new Date(), 'YYYY-MM-DD');
    const data = errorQueue.filter(error => !error.sent);
    if (data.length > 0) {
      Services.post(import.meta.env.VITE_SERVER_URL + '/error/save', data)
        .then(() => {
          errorQueue.forEach(error => error.sent = true);
          errorQueue = errorQueue.filter(error => error.occurred_on === currentDate);
        })
        .catch(console.error)
        .finally(() => {
          errorQueue = errorQueue.filter(error => error.tries < 3 && !error.sent);
          errorQueue.forEach(error => error.tries++);
          saveErrorQueue();
        })
    }
  }
}

loadErrorQueue();
syncErrorQueue();
