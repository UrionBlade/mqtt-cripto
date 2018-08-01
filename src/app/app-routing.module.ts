import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MqttClientComponent } from './components/mqtt-client/mqtt-client.component';

const routes: Routes = [
    {
        path: '',
        redirectTo: '/mqttClient',
        pathMatch: 'full'
    },
    {
        path: 'mqttClient',
        component: MqttClientComponent
    },
]

@NgModule({
    imports: [
      RouterModule.forRoot(routes),
    ],
    exports: [RouterModule]
})
export class AppRoutingModule { }
