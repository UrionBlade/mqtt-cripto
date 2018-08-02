import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, NgZone } from '@angular/core'
import {CdkTextareaAutosize} from '@angular/cdk/text-field'
import { Root } from 'protobufjs'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { BrokerConfiguration } from '../model/broker-configuration'
import { Topic } from '../model/topic'
import { protocols } from '../model/protocol'
import connectClient from '../../app-mqtt'
import { Messages } from '../model/messages'
import { ShowedMessage } from '../model/showed-message'
import { ProtoInfo } from '../model/protoInfo'
import { MatSnackBar, MatSnackBarConfig } from '@angular/material'
import {take} from 'rxjs/operators'

const storage = require('electron-storage')
const mqtt = require('mqtt')
const path = require('path')
const dataPath = 'data/'
const mqttConfig = 'mqttConfig.json'
const topicFile = 'topics.json'
const protoFile = 'proto.json'
let client

@Component({
  selector: 'app-mqtt-client',
  templateUrl: './mqtt-client.component.html',
  styleUrls: ['./mqtt-client.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class MqttClientComponent implements OnInit {

  configurationForm: FormGroup
  topicForm: FormGroup
  protoForm: FormGroup
  publishForm: FormGroup

  broker: BrokerConfiguration = new BrokerConfiguration('', 1883, 'mqtt', 'Mqtt Client ID', '', '', '1')
  subscribeTo: Topic = new Topic(Array())
  messages: Array<Messages> = new Array()
  protocol = protocols
  focussedMessage = new ShowedMessage('', '')
  proto: ProtoInfo = new ProtoInfo('', '', '', '')
  currentIndex: number
  publishingMessage: string
  publishingQos: number

  constructor(private _formBuilder: FormBuilder, private cd: ChangeDetectorRef, public snackBar: MatSnackBar, private ngZone: NgZone) { }

  @ViewChild('autosize') autosize: CdkTextareaAutosize;

  triggerResize() {
    // Wait for changes to be applied, then trigger textarea resize.
    this.ngZone.onStable.pipe(take(1))
        .subscribe(() => this.autosize.resizeToFitContent(true));
  }

  // ======================================================================= //
  //                Show snackbar on the bottom of the page                  //
  // ======================================================================= //

  showSnackBar(message: string)  {
    const config = new MatSnackBarConfig()
    config.panelClass = ['snack-bar-container']
    config.duration = 3000
    config.verticalPosition = 'top'
    this.snackBar.open(message, null, config)
  }

  // ======================================================================= //
  //                Save broker configuration into JSON file.                //
  // ======================================================================= //

  saveBrokerConfig() {
    console.log(this.broker)
    storage.remove(dataPath + mqttConfig).then( err => {
        if (err) {
          console.error(err)
        } else {
          storage.set(dataPath + mqttConfig, this.broker, ( error ) => {
            if (error) {
              console.error(error)
              this.showSnackBar('Can\'t save your configuration.')
            } else {
              console.log('File mqttConfig.json created into ', dataPath)
              this.showSnackBar('Configuration succesfully saved.')
            }
          })
        }
      })
  }

  // ======================================================================= //
  //          Delete JSON file that contains broker configuration.           //
  // ======================================================================= //

  deleteBrokerConfig() {
    storage.isPathExists(dataPath + mqttConfig)
    .then(itDoes => {
      if (itDoes) {
        storage.remove(dataPath + mqttConfig).then( err => {
            if (err) {
              console.error(err)
              this.showSnackBar('Can\'t delete broker config file.')
            } else {
              this.broker.brokerAddress = ''
              this.broker.brokerPassword = ''
              this.broker.brokerUser = ''
              this.cd.detectChanges()
              console.log('File mqttConfig.json deleted from ', dataPath)
              this.showSnackBar('Deleted broker config file.')
            }
          })
        }
      })
  }

  // ======================================================================= //
  //               Connect to the broker using selected protocol             //
  // ======================================================================= //

  connectBroker() {

    if (client) {
      client.end()
    }

    client = connectClient(
      this.broker.brokerAddress,
      this.broker.brokerPort,
      this.broker.protocol,
      this.broker.brokerUser,
      this.broker.brokerPassword,
      this.broker.qos
    )
    this.showSnackBar('Broker connection estabilshed.')
  }

  // ======================================================================= //
  //            Disconnect to the broker when user click on button           //
  // ======================================================================= //

  disconnectBroker() {
    client.end()
    console.log('Disconnected from broker succesfully')
    this.showSnackBar('Disconnected from broker')
  }

  // ======================================================================= //
  //         Save topic into JSON file when user click 'Save' button         //
  // ======================================================================= //

  saveTopic() {
    storage.remove(dataPath + topicFile).then( err => {
        if (err) {
          console.error(err)
        } else {
          storage.set(dataPath + topicFile, this.subscribeTo, (error) => {
            if (error) {
              console.error(error)
              this.showSnackBar('Can\'t save topic.')
            } else {
              console.log('File topics.json created into ', dataPath)
              this.showSnackBar('Topic saved succesfully.')
            }
          })
        }
      })
  }

  // ======================================================================= //
  //       Delete topic into JSON file when user click 'Delete' button       //
  // ======================================================================= //

  deleteTopic() {
    storage.isPathExists(dataPath + topicFile)
    .then(itDoes => {
      if (itDoes) {
        storage.remove(dataPath + topicFile).then( err => {
            if (err) {
              console.error(err)
              this.showSnackBar('Can\'t delete topic file.')
            } else {
              this.subscribeTo.topics = new Array()
              this.cd.detectChanges()
              console.log('File topics.json deleted from ', dataPath)
              this.showSnackBar('Topic file deleted succesfully.')
            }
          })
        }
      })
  }

  // ======================================================================= //
  //       Subscribe to a topic when user click 'Subscribe' button.          //
  // ======================================================================= //

  subscribeTopic() {

    const self = this
    this.showSnackBar(`Subscribed to topic ${this.subscribeTo.topics}.`)
    client.subscribe(this.subscribeTo.topics)
    .on('message', function (topic, message) {
      const mess: Messages = new Messages(message, topic.toString())
      self.messages = [...self.messages, mess]
      self.cd.detectChanges()
    })
    .on('connect', (packet) => {
      console.log('connected!', JSON.stringify(packet))
    })
  }

  // ======================================================================= //
  //       Unsubscribe from a topic. This operation will clear message       //
  //                               buffer too.                               //
  // ======================================================================= //

  unsubscribeTopic() {
    this.clearBuffer()
    client.unsubscribe(this.subscribeTo.topics)
    console.log('Succesfully unsubscribed')
    this.showSnackBar(`Unsubscribed from topic ${this.subscribeTo.topics} succesfully.`)
  }

  // ======================================================================= //
  //        Clear message buffer when user click on 'Clear' button.          //
  //             Once you clear buffer, you lose all messages                //
  // ======================================================================= //

  clearBuffer() {
    this.messages = new Array()
    this.cd.detectChanges()
    this.showSnackBar('Message buffer cleared.')
  }

  // ======================================================================= //
  //          When user click on the topic into the topic list,              //
  //               on the message card, the message appear.                  //
  // ======================================================================= //

  openMessage( index: number) {
    this.currentIndex = index
    this.toHex()
    console.log('Current message: ', this.focussedMessage.message)
    this.showSnackBar('Opened clicked message.')
    this.focussedMessage.topic = this.messages[index].topic
  }

  // ======================================================================= //
  //                  Convert the proto message to hex                       //
  // ======================================================================= //

  toHex() {
    let result = ''
    for (let i = 0; i < this.messages[this.currentIndex].message.toString().length; i++) {
      result  += '000' + this.messages[ this.currentIndex].message[i].toString(16).slice(-4) + ' '
      if ( i % 15 === 0 ) {
        result += '\n'
      }
    }
    this.focussedMessage.message = result.toUpperCase()
    this.showSnackBar('Message converted to HEX.')
  }

  fromHexToString(hex) {

    let result

    for (let j = 0; j < hex.length; j++) {
        result += String.fromCharCode(parseInt(hex[j], 16))
    }

    return result
  }

  // ======================================================================= //
  //                Convert the proto message to string                      //
  // ======================================================================= //

  toStrings() {
    this.focussedMessage.message = this.messages[this.currentIndex].message.toString()
    this.showSnackBar('Message converted to STRING.')
  }

  // ======================================================================= //
  //                 Convert the proto message to json                       //
  // ======================================================================= //

  toJson() {
    const self = this
    const pbRoot = new Root()
    pbRoot.resolvePath = (origin: string, target: string) => {
      const result = self.proto.protoBuffPath + '/' + target
      console.log('Result: ', result)
      return result
    }

    pbRoot.load(this.proto.protoBuffFile, { keepCase: true }, function(err, root) {
      if (err) {
        console.log(err)
        self.showSnackBar('Failed to convert message to JSON.')
        throw err
      } else {
        const MyMessage = root.lookupType(self.proto.protoBuffPackage + '.' + self.proto.protoBuffMessage)
        const array: Uint8Array = self.messages[self.currentIndex].message.slice()
        console.log('Array', array.join(', '))
        self.focussedMessage.message = JSON.stringify(MyMessage.decode(array), null, '\t')
        self.showSnackBar('Message converted to JSON.')
      }
    })
  }

  // ======================================================================= //
  //                    Save proto info into a json file                     //
  // ======================================================================= //

  saveProto() {
    storage.remove(dataPath + protoFile).then( err => {
        if (err) {
          console.error(err)
        } else {
          storage.set(dataPath + protoFile, this.proto, (error) => {
            if (error) {
              this.showSnackBar('Can\'t save proto info.')
              console.error(error)
            } else {
              console.log('File proto.json created into ', dataPath)
              this.showSnackBar('Proto info saved succesfully.')
            }
          })
        }
      })
  }

  // ======================================================================= //
  //                    Save proto info into a json file                     //
  // ======================================================================= //

  deleteProto() {
    storage.isPathExists(dataPath + protoFile)
    .then(itDoes => {
      if (itDoes) {
        storage.remove(dataPath + protoFile).then( err => {
            if (err) {
              console.error(err)
              this.showSnackBar('Can\'t delete proto info.')
            } else {
              this.proto = new ProtoInfo('', '', '', '')
              this.cd.detectChanges()
              console.log('File proto.json deleted from ', dataPath)
              this.showSnackBar('Proto info deleted succesfully.')
            }
          })
        }
      })
  }

  // ======================================================================= //
  //         When user click the button 'Remove' on message Card,            //
  //                         the message disappear.                          //
  // ======================================================================= //

  removeMessage() {
    this.focussedMessage = new ShowedMessage('', '')
  }


  publish() {
    const self = this
    const pbRoot = new Root()
    pbRoot.resolvePath = (origin: string, target: string) => {
      const result = self.proto.protoBuffPath + '/' + target
      return result
    }

    pbRoot.load(this.proto.protoBuffFile, { keepCase: true }, function(err, root) {
      if (err) {
        console.log(err)
        self.showSnackBar('Failed to convert message to JSON.')
        throw err
      } else {
        const myMessage = root.lookupType(self.proto.protoBuffPackage + '.' + self.proto.protoBuffMessage)
        const buffer = myMessage.encode(JSON.parse(self.publishingMessage)).finish()
        console.log('Buffer: ', buffer)
        client.publish(self.subscribeTo.topics[0], buffer, self.publishingQos ? self.publishingQos : '0')
        self.showSnackBar('Message published on MQTT.')
      }
    })
  }

  publishHex() {
    client.publish(this.subscribeTo.topics[0], this.fromHexToString(this.publishingMessage), this.publishingQos ? this.publishingQos : '0')
    this.showSnackBar('Message published on MQTT.')
  }

  publishString() {
    client.publish(this.subscribeTo.topics[0], this.publishingMessage, this.publishingQos ? this.publishingQos : '0')
    this.showSnackBar('Message published on MQTT.')
  }

  copyMessage(text: string) {
    const textArea = document.createElement('textarea')
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      const msg = successful ? 'successful' : 'unsuccessful';
      console.log('Copying text command was ' + msg);
      this.showSnackBar('Message copied on clipboard ' + msg)
    } catch (err) {
      this.showSnackBar('Oops, unable to copy')
      console.log('Oops, unable to copy');
    }
    document.body.removeChild(textArea);
  }

  ngOnInit() {

    storage.isPathExists(dataPath + mqttConfig)
      .then(itDoes => {
        if (itDoes) {
          storage.get(dataPath + mqttConfig)
            .then(data => {
              this.broker.brokerAddress   = data.brokerAddress
              this.broker.brokerPassword  = data.brokerPassword
              this.broker.clientId        = data.clientId
              this.broker.brokerPort      = data.brokerPort
              this.broker.brokerUser      = data.brokerUser
              this.broker.qos             = data.qos
              this.broker.protocol        = data.protocol
              this.cd.detectChanges()
            })
            .catch(err => {
              console.error(err)
            })
        }
    })

    storage.isPathExists(dataPath + topicFile)
      .then(itDoes => {
        if (itDoes) {
          storage.get(dataPath + topicFile)
            .then(data => {
              this.subscribeTo.topics = data.topics
              this.cd.detectChanges()
            })
            .catch(err => {
              console.error(err)
            })
        }
    })

    storage.isPathExists(dataPath + protoFile)
    .then(itDoes => {
      if (itDoes) {
        storage.get(dataPath + protoFile)
          .then(data => {
            this.proto = data
            this.cd.detectChanges()
          })
          .catch(err => {
            console.error(err)
          })
      }
  })

    this.configurationForm = this._formBuilder.group({
      mqttBrokerAddress:  this._formBuilder.control,
      mqttBrokerPort:     this._formBuilder.control,
      mqttClientID:       this._formBuilder.control,
      mqttBrokerUser:     this._formBuilder.control,
      mqttBrokerPassword: this._formBuilder.control,
      mqttBrokerProtocol: this._formBuilder.control,
      mqttQos:            this._formBuilder.control,
    })

    this.topicForm = this._formBuilder.group({
      topicSubscribed:    this._formBuilder.control
    })

    this.protoForm = this._formBuilder.group({
      protoBuffPath:      this._formBuilder.control,
      protoBuffFile:      this._formBuilder.control,
      protoPackage:       this._formBuilder.control,
      protoMessage:       this._formBuilder.control
    })

    this.publishForm = this._formBuilder.group({
      publishTopic:       this._formBuilder.control,
      publishMessage:     this._formBuilder.control,
      publishProtoPath:   this._formBuilder.control,
      publishProtoFile:   this._formBuilder.control,
      publishProtoPack:   this._formBuilder.control,
      publishProtoMess:   this._formBuilder.control,
      publishQos:         this._formBuilder.control
    })

  }

}
