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

  // ======================================================================= //
  //          This method trigger auto resizes of the text area.             //
  // ======================================================================= //

  triggerResize() {
    // Wait for changes to be applied, then trigger textarea resize.
    this.ngZone.onStable.pipe(take(1))
        .subscribe(() => this.autosize.resizeToFitContent(true));
  }

  // ======================================================================= //
  //              Show snackbar on the bottom of the page.                   //
  // ======================================================================= //

  showSnackBar(message: string, action?: string)  {
    const config = new MatSnackBarConfig()
    config.panelClass = ['snack-bar-container']
    config.duration = 3000
    config.verticalPosition = 'top'
    this.snackBar.open(message, action, config)
  }

  // ======================================================================= //
  //               Save broker configuration into JSON file.                 //
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
  //            Connect to the broker using the selected protocol.           //
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
  //        Disconnect to the broker when the user clicks on a button.       //
  // ======================================================================= //

  disconnectBroker() {
    client.end()
    console.log('Disconnected from broker succesfully')
    this.showSnackBar('Disconnected from broker')
  }

  // ======================================================================= //
  //     Save topic into JSON file when the user clicks the'Save' button.    //
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
  //       Delete topic into JSON file when user click 'Delete' button.      //
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
  //    Subscribe to a topic when the user clicks the 'Subscribe' button.    //
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
  //      Clear message buffer when the user clicks on 'Clear' button.       //
  //             Once you clear buffer, you lose all messages                //
  // ======================================================================= //

  clearBuffer() {
    this.messages = new Array()
    this.cd.detectChanges()
    this.showSnackBar('Message buffer cleared.')
  }

  // ======================================================================= //
  //         When the user clicks on the topic into the topic list,          //
  //               on the message card, the message appears.                 //
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
    }
    this.focussedMessage.message = result.toUpperCase()
    this.showSnackBar('Message converted to HEX.')
  }

  // ======================================================================= //
  //                       Convert hex to a string                           //
  // ======================================================================= //

  fromHexToString(hex) {

    let result

    for (let j = 0; j < hex.length; j++) {
        result += String.fromCharCode(parseInt(hex[j], 16))
    }

    return result
  }

  // ======================================================================= //
  //               Convert the proto message to a string                     //
  // ======================================================================= //

  toStrings() {
    this.focussedMessage.message = this.messages[this.currentIndex].message.toString()
    this.showSnackBar('Message converted to STRING.')
  }

  // ======================================================================= //
  //                 Convert the proto message to JSON.                      //
  // ======================================================================= //

  toJson() {
    const self = this
    const pbRoot = new Root()
    pbRoot.resolvePath = (origin: string, target: string) => {
      const result = self.proto.protobufPath + '/' + target
      console.log('Result: ', result)
      return result
    }

    pbRoot.load(this.proto.protobufFile, { keepCase: true }, function(err, root) {
      if (err) {
        self.showSnackBar('Failed to convert message to JSON.')
        console.log(err)
        throw err
      } else {
        const myMessage = root.lookupType(self.proto.protobufPackage + '.' + self.proto.protobufMessage)
        const array: Uint8Array = self.messages[self.currentIndex].message.slice()
        console.log('Array', array.join(', '))
        const error = myMessage.verify(myMessage.decode(array))
        if (error) {
          self.showSnackBar('Cannot convert this message.')
        } else {
          self.focussedMessage.message = JSON.stringify(myMessage.decode(array), null, '\t')
          self.showSnackBar('Message converted to JSON.')
        }
      }
    })
  }

  // ======================================================================= //
  //                    Save proto info into a JSON file.                    //
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
  //                  Delete proto info into a JSON file.                    //
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
  //       When the user clicks the button 'Remove' on message Card,         //
  //                        the message disappears.                          //
  // ======================================================================= //

  removeMessage() {
    this.focussedMessage = new ShowedMessage('', '')
  }

  // ======================================================================= //
  //                 Publish a message as a protobuf message.                //
  // ======================================================================= //

  publish() {
    const self = this
    const pbRoot = new Root()
    pbRoot.resolvePath = (origin: string, target: string) => {
      const result = self.proto.protobufPath + '/' + target
      return result
    }

    pbRoot.load(this.proto.protobufFile, { keepCase: true }, function(err, root) {
      if (err) {
        console.log(err)
        self.showSnackBar('Failed to convert message to JSON.')
        throw err
      } else {
        const myMessage = root.lookupType(self.proto.protobufPackage + '.' + self.proto.protobufMessage)
        const payload = myMessage.create(JSON.parse(self.publishingMessage))
        const str = myMessage.encode(payload).finish()
        console.log(str.join(' ,'))
        client.publish(self.subscribeTo.topics[0], str, self.publishingQos ? self.publishingQos : '0')
        self.showSnackBar('Message published on MQTT.')
      }
    })
  }

  // ======================================================================= //
  //                  Publish a message as a hex message.                    //
  // ======================================================================= //

  publishHex() {
    client.publish(this.subscribeTo.topics[0], this.fromHexToString(this.publishingMessage), this.publishingQos ? this.publishingQos : '0')
    this.showSnackBar('Message published on MQTT.')
  }

  // ======================================================================= //
  //                 Publish a message as a string message.                  //
  // ======================================================================= //

  publishString() {
    client.publish(this.subscribeTo.topics[0], this.publishingMessage, this.publishingQos ? this.publishingQos : '0')
    this.showSnackBar('Message published on MQTT.')
  }

  // ======================================================================= //
  //          Copy the message into a <pre></pre> tag to the clipboard       //
  // ======================================================================= //

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

  // ======================================================================= //
  //                  Clear the content of the text area.                    //
  // ======================================================================= //

  cleanTextArea() {
    const elem = document.getElementById('publish-text-area') as HTMLInputElement;
    elem.value = ''
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
      protobufPath:      this._formBuilder.control,
      protobufFile:      this._formBuilder.control,
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
