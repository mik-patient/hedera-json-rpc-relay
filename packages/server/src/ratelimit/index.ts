/*-
 *
 * Hedera JSON RPC Relay
 *
 * Copyright (C) 2022 Hedera Hashgraph, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

export default class RateLimit {
  duration: number;
  database: any;

  constructor(duration) {
    this.duration = duration;
    this.database = Object.create(null);
  }

  shouldRateLimit(ip: string, methodName: string, total: number): boolean {
    this.precheck(ip, methodName, total);
    if (!this.shouldReset(ip)) {
      if (this.checkRemaining(ip, methodName)) {
        this.decreaseRemaining(ip, methodName);
        return false;
      }
      return true;
    } else {
      this.reset(ip, methodName, total);
      this.decreaseRemaining(ip, methodName);
      return false;
    }
  }

  private precheck(ip: string, methodName: string, total: number) {
    if (!this.checkIpExist(ip)) {
      this.setNewIp(ip);
    }

    if (!this.checkMethodExist(ip, methodName)) {
      this.setNewMethod(ip, methodName, total);
    }
  }

  private setNewIp(ip: string) {
    const entry: DatabaseEntry = {
      reset: Date.now() + this.duration,
      methodInfo: {},
    };
    this.database[ip] = entry;
  }

  private setNewMethod(ip: string, methodName: string, total: number) {
    const entry: MethodDatabase = {
      methodName: methodName,
      remaining: total,
      total: total,
    };
    this.database[ip].methodInfo[methodName] = entry;
  }

  private checkIpExist(ip: string): boolean {
    return this.database[ip] !== undefined ? true : false;
  }

  private checkMethodExist(ip: string, method: string): boolean {
    return this.database[ip].methodInfo[method] !== undefined ? true : false;
  }

  private checkRemaining(ip: string, methodName: string): boolean {
    return this.database[ip].methodInfo[methodName].remaining > 0 ? true : false;
  }

  private shouldReset(ip: string): boolean {
    return this.database[ip].reset < Date.now() ? true : false;
  }

  private reset(ip: string, methodName: string, total: number) {
    this.database[ip].reset = Date.now() + this.duration;
    for (const [key] of Object.entries(this.database[ip].methodInfo)) {
      this.database[ip].methodInfo[key].remaining = this.database[ip].methodInfo[key].total;
    }
    this.database[ip].methodInfo[methodName].remaining = total;
  }

  private decreaseRemaining(ip: string, methodName: string) {
    let remaining =
      this.database[ip].methodInfo[methodName].remaining > 0
        ? this.database[ip].methodInfo[methodName].remaining - 1
        : 0;

    this.database[ip].methodInfo[methodName].remaining = remaining;
  }
}

interface DatabaseEntry {
  reset: number;
  methodInfo: any;
}

interface MethodDatabase {
  methodName: string;
  remaining: number;
  total: number;
}
