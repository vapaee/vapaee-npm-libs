import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from './analytics.service';
import { LocalStringsService } from './local-strings.service';
import { DomService } from './dom.service';
import { FacebookService } from './facebook.service';
import { AppService, LoadingOverall } from './app.service';
import { DropdownService } from './dropdown.service';

@NgModule({
    declarations: [LoadingOverall],
    entryComponents: [
        LoadingOverall
    ],
    imports: [
        CommonModule,
        HttpClientModule
    ],
    providers: [
        AnalyticsService,
        LocalStringsService,
        DomService,
        FacebookService,
        AppService,
        DropdownService
    ],
    exports: [LoadingOverall],
})

export class CommonServicesModule {}
