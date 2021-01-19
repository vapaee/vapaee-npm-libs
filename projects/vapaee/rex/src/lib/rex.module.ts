import { NgModule } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { VapaeeREX } from './rex.service';

@NgModule({
  imports: [
  ],
  declarations: [],
  providers: [VapaeeREX, CookieService],
  exports: []
})
export class VapaeeRexModule { }
