/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dns from 'dns';
import { promisify } from 'util';

import { IHostedZone } from './hosted-zone';
// import { AcceleratorStackProps } from '../../../accelerator/lib/stacks/accelerator-stack';
// import * as winston from 'winston';
// import { createLogger } from '../../..//utils/lib/logger';

export interface IRecordSet extends cdk.IResource {
  readonly recordSetId: string;
}

export interface RecordSetProps {
  readonly type: string;
  readonly name: string;
  readonly govCloud?: boolean;

  readonly hostedZone: IHostedZone;
  readonly dnsName?: string;
  readonly hostedZoneId?: string;
}

const resolve = promisify(dns.resolve);

export class RecordSet extends cdk.Resource implements IRecordSet {
  // protected logger: winston.Logger;
  readonly recordSetId: string;

  constructor(scope: Construct, id: string, props: RecordSetProps) {
    super(scope, id);

    console.log("Dns Type: ", props.type);
    console.log("Name: ", props.name);
    console.log("Hosted Zone ID: ", props.hostedZone.hostedZoneId);
    const resource = new cdk.aws_route53.CfnRecordSet(this, 'Resource', {
      type: props.type,
      name: props.name,
      hostedZoneId: props.hostedZone.hostedZoneId,
      resourceRecords: [''], // Placeholder value
    });

    this.recordSetId = resource.ref;

    // Resolve DNS asynchronously and update the resource
    this.resolveDns(props).then(addresses => {
      if (addresses && addresses.length > 0) {
        resource.addPropertyOverride('ResourceRecords', addresses);
      }
    });
  }

  // constructor(scope: Construct, id: string, props: RecordSetProps) {
  //   super(scope, id);
  

  //   let resource: cdk.aws_route53.CfnRecordSet;

  //     // Resolve DNS asynchronously and update the resource
  //     const addresses = this.resolveDns(props);
  //     // Create a placeholder resource
  //     resource = new cdk.aws_route53.CfnRecordSet(this, 'Resource', {
  //       type: props.type,
  //       name: props.name,
  //       hostedZoneId: props.hostedZone.hostedZoneId,
  //       resourceRecords: [addresses],
  //     });


  //   this.recordSetId = resource.ref;
  // }

  private async resolveDns(props: RecordSetProps) {
    console.log("Dns Name: ", props.dnsName);
    try {
      const addresses = await resolve(props.dnsName!, 'A');
      // this.logger.info("Addresses: ", addresses);
      console.log("Addresses: ", addresses);
      return addresses;
    } catch (error) {
      // this.logger.error(error);
      console.log(error);
    }
    return null;
  }

  static getHostedZoneNameFromService(service: string, region: string): string {
    let hostedZoneName = `${service}.${region}.amazonaws.com`;
    const sagemakerArray = ['notebook', 'studio'];
    if (sagemakerArray.includes(service)) {
      hostedZoneName = `${service}.${region}.sagemaker.aws`;
    }
    if (service === 's3-global.accesspoint') {
      hostedZoneName = `${service}.aws.com`;
    }
    return hostedZoneName;
  }
}