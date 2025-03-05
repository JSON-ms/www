let requestCount = 0;

export class Services {

  static get(url: string): Promise<any> {
    return this.handle(url, 'GET');
  }

  static post(url: string, body?: any): Promise<any> {
    return this.handle(url, 'POST', body);
  }

  static delete(url: string, body?: any): Promise<any> {
    return this.handle(url, 'DELETE', body);
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

  private static handle(url: string, method = 'GET', body?: any): Promise<any> {
    const params: any = {
      credentials: 'include',
      method,
      headers: {
        'Content-Type': 'application/json'
      },
    };
    if (body) {
      params.body = JSON.stringify(body)
    }
    this.doRequestCount(1)
    return fetch(url, params)
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            this.doRequestCount(-1);
            throw new Error(text);
          });
        }
        return new Promise((resolve) => {
          response.json().then(resolve);
        });
      })
      .finally(() => this.doRequestCount(-1));
  }
}
