import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core'
import { MatButtonModule } from '@angular/material'
import { MatMenuModule } from '@angular/material/menu'

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
