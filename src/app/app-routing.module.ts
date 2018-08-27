import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MqttClientComponent } from './components/mqtt-client/mqtt-client.component';
import { PostersComponent } from './components/posters/posters.component';

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
    {
        path: 'httpClient',
        component: PostersComponent
    },
]

@NgModule({
    imports: [
      RouterModule.forRoot(routes),
    ],
    exports: [RouterModule]
})
export class AppRoutingModule { }
