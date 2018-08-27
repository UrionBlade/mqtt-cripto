import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpService } from '../../providers/http.service'

@Component({
  selector: 'app-posters',
  templateUrl: './posters.component.html',
  styleUrls: ['./posters.component.scss']
})
export class PostersComponent implements OnInit {

  myJson

  constructor(private cd: ChangeDetectorRef, private service: HttpService) { }

  callGet() {
    const self = this
    this.service.get('http://localhost:9000/api/v1/inventory/cages').subscribe(
      res => {
        self.myJson = JSON.stringify(res, null, '\t')
        this.cd.detectChanges()
      }
    )
  }

  ngOnInit() {
    this.callGet()
  }

}
