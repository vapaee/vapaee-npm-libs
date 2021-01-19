import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularMaterialModule } from './angular.material.module';
import { VapaeeComponentsService } from './vapaee-components.service';
import { VpeMainTopSideMenuComponent } from './vpe-main-top-side-menu/vpe-main-top-side-menu.component';
import { LayoutModule } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { VpeMainTopSideMenuService } from './vpe-main-top-side-menu/vpe-main-top-side-menu.service';





@NgModule({
    declarations: [
        VpeMainTopSideMenuComponent
    ],
    imports: [
        BrowserModule,
        FormsModule,
        AngularMaterialModule,
        LayoutModule,
        MatToolbarModule,
        MatButtonModule,
        MatSidenavModule,
        MatIconModule,
        MatListModule,
        // -------------------
        
    ],
    providers: [
        VapaeeComponentsService,
        VpeMainTopSideMenuService
    ],
    exports: [
        VpeMainTopSideMenuComponent
    ]
})
export class VapaeeComponentsModule { }
