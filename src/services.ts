let requestCount = 0;

export class Services {

  static get(url: string): Promise<any> {
    return this.handle(url, 'GET', undefined, {
      'Content-Type': 'application/json',
    });
  }

  static post(url: string, body?: any): Promise<any> {
    return this.handle(url, 'POST', JSON.stringify(body), {
      'Content-Type': 'application/json',
    });
  }

  static delete(url: string, body?: any): Promise<any> {
    return this.handle(url, 'DELETE', body, {
      'Content-Type': 'application/json',
    });
  }

  static upload(url: string, file: File, callback: (percentage: number, completed: boolean) => void = () => {}): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.handle(url, 'POST', formData, undefined, {
      onUploadProgress: (event: ProgressEvent) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          callback(percentComplete, percentComplete >= 100);
        }
      }
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

  private static handle(url: string, method = 'GET', body?: any, headers: {[key: string]: any} = {}, params: {[key: string]: any} = {}): Promise<any> {
    const finalParams: any = {
      credentials: 'include',
      method,
      body,
      headers,
      ...params
    };
    this.doRequestCount(1)
    return new Promise((resolve, reject) => {
      fetch(url, finalParams)
        .then(response => {
          if (!response.ok) {
            return response.text().then(text => {
              this.doRequestCount(-1);
              throw new Error(text);
            });
          }
          return response.json().then(resolve);
        })
        .then(resolve)
        .catch(reject)
        .finally(() => this.doRequestCount(-1));
    })
  }
}
