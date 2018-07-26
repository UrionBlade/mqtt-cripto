import { connect } from 'mqtt';

export default function connectClient(brokerAddress, brokerPort, protocol, brokerUser, brokerPassword, qos) {
    const client = connect({
        host: brokerAddress,
        port: brokerPort,
        protocol: protocol,
        username: brokerUser,
        password: brokerPassword,
        qos: qos
    });

    client.on('connect', function() {
        console.log('connected');
    });

    return client;
}
