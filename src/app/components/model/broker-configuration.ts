export class BrokerConfiguration {
    constructor(
        public brokerAddress:   string,
        public brokerPort:      number,
        public protocol:        'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl' | 'wx' | 'wxs',
        public clientId:        string,
        public brokerUser:      string,
        public brokerPassword:  string,
        public qos:             string
    ) {}
}
