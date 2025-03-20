let requestCount = 0;

export class Services {

  static get(url: string, params: {[key: string]: any} = {}): Promise<any> {
    return this.handle(url, {
      method: 'GET',
      credentials: 'include',
      ...params,
      headers: {
        'Content-Type': 'application/json',
        ...(params.headers || {}),
      },
    });
  }

  static download(url: string, params: {[key: string]: any} = {}): Promise<any> {
    return this.handle(url, {
      method: 'GET',
      ...params,
      headers: {
        'Content-Type': 'application/octet-stream',
        ...(params.headers || {}),
      },
    }, 'application/octet-stream');
  }

  static post(url: string, body?: any, params: {[key: string]: any} = {}): Promise<any> {
    return this.handle(url, {
      method: 'POST',
      body: JSON.stringify(body),
      credentials: 'include',
      ...params,
      headers: {
        'Content-Type': 'application/json',
        ...(params.headers || {}),
      },
    });
  }

  static delete(url: string, body?: any, params: {[key: string]: any} = {}): Promise<any> {
    return this.handle(url, {
      method: 'DELETE',
      body: JSON.stringify(body),
      credentials: 'include',
      ...params,
      headers: {
        'Content-Type': 'application/json',
        ...(params.headers || {}),
      },
    });
  }

  static upload(url: string, file: File, callback: (percentage: number, completed: boolean) => void = () => {}, params: {[key: string]: any} = {}): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.handle(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      onUploadProgress: (event: ProgressEvent) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          callback(percentComplete, percentComplete >= 100);
        }
      },
      ...params,
      headers: params.headers || {},
    });
  }

  private static doRequestCount(amount = 0) {
    const hadClass = document.body.classList.contains('ajax-loading');
    requestCount += amount
    if (requestCount === 0 && hadClass) {
      document.body.classList.remove('ajax-loading');
    }
    else if (requestCount > 0 && !hadClass) {
      document.body.classList.add('ajax-loading');
    }
  }

  private static handle(url: string, params: {[key: string]: any} = {}, contentType = 'application/json'): Promise<any> {
    this.doRequestCount(1)
    return new Promise((resolve, reject) => {
      fetch(url, params)
        .then(async response => {
          if (!response.ok) {
            return response.text().then(text => {
              this.doRequestCount(-1);
              throw new Error(text);
            });
          }
          if (contentType === 'application/json') {
            return response.json().then(resolve);
          } else if (contentType === 'application/octet-stream') {
            return response.blob().then(resolve);
          }
          return response.text().then(resolve);
        })
        .then(resolve)
        .catch(reject)
        .finally(() => this.doRequestCount(-1));
    })
  }
}
