import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { MqttClientComponent } from './components/mqtt-client/mqtt-client.component';

const routes: Routes = [
    {
        path: '',
        redirectTo: '/home',
        pathMatch: 'full'
    },
    {
        path: 'home',
        component: HomeComponent
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
