# Generated by Django 5.2 on 2025-04-20 21:09

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_journalentry_follow_strategy'),
    ]

    operations = [
        migrations.AddField(
            model_name='journalentry',
            name='confidence_before',
            field=models.IntegerField(blank=True, help_text='Confidence level before trade (1-10)', null=True),
        ),
        migrations.AddField(
            model_name='journalentry',
            name='confidence_during',
            field=models.IntegerField(blank=True, help_text='Confidence level during trade (1-10)', null=True),
        ),
        migrations.AddField(
            model_name='journalentry',
            name='feeling_during',
            field=models.CharField(blank=True, choices=[('Very worried', 'Very worried'), ('Worried', 'Worried'), ('Slightly worried', 'Slightly worried'), ('Neutral', 'Neutral'), ('Slightly confident', 'Slightly confident'), ('Very confident', 'Very confident')], max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='journalentry',
            name='review_rating',
            field=models.IntegerField(blank=True, help_text='Rating for this trade (1-10)', null=True),
        ),
        migrations.AlterField(
            model_name='journalentry',
            name='feeling_before',
            field=models.CharField(blank=True, choices=[('Hesitant', 'Hesitant'), ('Slightly hesitant', 'Slightly hesitant'), ('Neutral', 'Neutral'), ('Slightly confident', 'Slightly confident'), ('Very confident', 'Very confident')], max_length=50, null=True),
        ),
    ]
