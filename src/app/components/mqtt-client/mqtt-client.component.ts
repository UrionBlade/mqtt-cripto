import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BrokerConfiguration } from '../model/broker-configuration';
import { Topic } from '../model/topic';
import { protocols } from '../model/protocol';
import connectClient from '../../app-mqtt';
import { Messages } from '../model/messages';

const storage = require('electron-storage');
const mqtt = require('mqtt');
const dataPath = 'data/';
const mqttConfig = 'mqttConfig.json';
const topicFile = 'topics.json';
let client;

@Component({
  selector: 'cripto-mqtt-client',
  templateUrl: './mqtt-client.component.html',
  styleUrls: ['./mqtt-client.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class MqttClientComponent implements OnInit {

  configurationForm: FormGroup;
  topicForm: FormGroup;

  broker: BrokerConfiguration = new BrokerConfiguration('', 1883, 'mqtt', 'Mqtt Client ID', '', '', '1');
  profiles: Array<BrokerConfiguration> = new Array();
  subscribeTo: Topic = new Topic(Array());
  messages: Array<Messages> = new Array(new Messages('', ''));
  protocol = protocols;
  focussedMessage = new Messages('', '');

  constructor(private _formBuilder: FormBuilder, private cd: ChangeDetectorRef) { }

  saveBrokerConfig() {
    console.log(this.broker);
    storage.remove(dataPath + mqttConfig).then( err => {
        if (err) {
          console.error(err);
        } else {
          storage.set(dataPath + mqttConfig, this.broker, ( err ) => {
            if (err) {
              console.error(err);
            } else {
              console.log('File mqttConfig.json created into ', dataPath);
            }
          });
        }
      });
  }

  deleteBrokerConfig() {
    storage.isPathExists(dataPath + mqttConfig)
    .then(itDoes => {
      if (itDoes) {
        storage.remove(dataPath + mqttConfig).then( err => {
            if (err) {
              console.error(err);
            } else {
              this.broker.brokerAddress = '';
              this.broker.brokerPassword = '';
              this.broker.brokerUser = '';
              this.cd.detectChanges();
              console.log('File mqttConfig.json deleted from ', dataPath);
            }
          });
        }
      });
  }

  connectBroker() {
    client = connectClient(
      this.broker.brokerAddress,
      this.broker.brokerPort,
      this.broker.protocol,
      this.broker.brokerUser,
      this.broker.brokerPassword,
      this.broker.qos
    );
  }

  disconnectBroker() {
    client.end();
    console.log('Disconnected from broker succesfully');
  }

  saveTopic() {
    storage.remove(dataPath + topicFile).then( err => {
        if (err) {
          console.error(err);
        } else {
          storage.set(dataPath + topicFile, this.subscribeTo, (err) => {
            if (err) {
              console.error(err);
            } else {
              console.log('File topics.json created into ', dataPath);
            }
          });
        }
      });
  }

  deleteTopic() {
    storage.isPathExists(dataPath + topicFile)
    .then(itDoes => {
      if (itDoes) {
        storage.remove(dataPath + topicFile).then( err => {
            if (err) {
              console.error(err);
            } else {
              this.subscribeTo.topics = new Array();
              this.cd.detectChanges();
              console.log('File topics.json deleted from ', dataPath);
            }
          });
        }
      });
  }

  subscribeTopic() {
    this.saveTopic();
    const self = this;
    client.subscribe(this.subscribeTo.topics)
    .on('message', function (topic, message) {
      const mess: Messages = new Messages('', '');
      mess.topic = topic.toString();
      mess.message = message.toString();
      self.messages = [...self.messages, mess];
      console.log(self.messages);
      self.cd.detectChanges();
    })
    .on('connect', (packet) => {
      console.log('connected!', JSON.stringify(packet));
    });
  }

  unsubscribeTopic() {
    this.clearBuffer();
    client.unsubscribe(this.subscribeTo.topics);
    console.log('Succesfully unsubscribed');
  }

  clearBuffer() {
    this.messages = new Array();
    this.cd.detectChanges();
  }

  openMessage( index: number) {
    this.focussedMessage.topic = this.messages[index].topic;
    this.focussedMessage.message = this.messages[index].message;
  }

  removeMessage() {
    this.focussedMessage = new Messages('', '');
  }

  ngOnInit() {

    storage.isPathExists(dataPath + mqttConfig)
      .then(itDoes => {
        if (itDoes) {
          storage.get(dataPath + mqttConfig)
            .then(data => {
              this.broker.brokerAddress   = data.brokerAddress;
              this.broker.brokerPassword  = data.brokerPassword;
              this.broker.clientId        = data.clientId;
              this.broker.brokerPort      = data.brokerPort;
              this.broker.brokerUser      = data.brokerUser;
              this.broker.qos             = data.qos;
              this.broker.protocol        = data.protocol;
              this.profiles = [...this.profiles, this.broker];
              this.cd.detectChanges();
            })
            .catch(err => {
              console.error(err);
            });
        }
    });

    storage.isPathExists(dataPath + topicFile)
      .then(itDoes => {
        if (itDoes) {
          storage.get(dataPath + topicFile)
            .then(data => {
              this.subscribeTo.topics = data.topics;
              this.cd.detectChanges();
            })
            .catch(err => {
              console.error(err);
            });
        }
    });

    this.configurationForm = this._formBuilder.group({
      mqttBrokerAddress:  this._formBuilder.control,
      mqttBrokerPort:     this._formBuilder.control,
      mqttClientID:       this._formBuilder.control,
      mqttBrokerUser:     this._formBuilder.control,
      mqttBrokerPassword: this._formBuilder.control,
      mqttBrokerProtocol: this._formBuilder.control,
      mqttQos:            this._formBuilder.control,
    });

    this.topicForm = this._formBuilder.group({
      topicSubscribed:    this._formBuilder.control
    });

  }

}
